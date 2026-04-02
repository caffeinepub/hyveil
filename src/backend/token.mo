import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Time "mo:core/Time";
import Int "mo:core/Int";

/// HYV Token — ICRC-2 compatible
/// Name: HYVEIL | Symbol: HYV | Decimals: 8 | Hard cap: 21,000,000 HYV
actor Token {
  let TOKEN_NAME = "HYVEIL";
  let TOKEN_SYMBOL = "HYV";
  let TOKEN_DECIMALS : Nat8 = 8;
  let HARD_CAP : Nat = 2_100_000_000_000_000; // 21M * 10^8

  var admin : ?Principal = null;
  var oraclePrincipal : ?Principal = null;
  var totalMinted : Nat = 0;

  let balances = Map.empty<Principal, Nat>();

  // M-07 FIX: Store allowance with optional expiry timestamp (nanoseconds).
  // icrc2_approve now records expires_at; icrc2_allowance and icrc2_transfer_from
  // reject expired approvals instead of silently treating them as valid indefinitely.
  type AllowanceEntry = {
    amount : Nat;
    expiresAt : ?Nat64; // nanoseconds since epoch; null = never expires
  };
  let allowances = Map.empty<Principal, Map.Map<Principal, AllowanceEntry>>();

  // --- Admin Setup ---
  public shared ({ caller }) func initAdmin() : async () {
    switch (admin) {
      case (?_) { Runtime.trap("Admin already set") };
      case (null) { admin := ?caller };
    };
  };

  public shared ({ caller }) func setOracle(p : Principal) : async () {
    switch (admin) {
      case (null) { Runtime.trap("Admin not set") };
      case (?a) {
        if (caller != a) { Runtime.trap("Unauthorized") };
        oraclePrincipal := ?p;
      };
    };
  };

  // --- ICRC-1 Core ---
  public query func icrc1_name() : async Text { TOKEN_NAME };
  public query func icrc1_symbol() : async Text { TOKEN_SYMBOL };
  public query func icrc1_decimals() : async Nat8 { TOKEN_DECIMALS };
  public query func icrc1_total_supply() : async Nat { totalMinted };
  public query func icrc1_maximum_supply() : async Nat { HARD_CAP };

  public query func balanceOf(account : Principal) : async Nat {
    switch (balances.get(account)) {
      case (null) { 0 };
      case (?b) { b };
    };
  };

  public query func icrc1_balance_of(account : { owner : Principal; subaccount : ?Blob }) : async Nat {
    switch (balances.get(account.owner)) {
      case (null) { 0 };
      case (?b) { b };
    };
  };

  public query func totalSupply() : async Nat { totalMinted };

  // --- Minting (oracle only) ---
  public shared ({ caller }) func mint(to : Principal, amount : Nat) : async () {
    switch (oraclePrincipal) {
      case (null) { Runtime.trap("Oracle not set") };
      case (?oracle) {
        if (caller != oracle) { Runtime.trap("Unauthorized: Only oracle can mint") };
      };
    };
    if (totalMinted + amount > HARD_CAP) {
      Runtime.trap("Hard cap reached: cannot mint more than 21M HYV");
    };
    let current = switch (balances.get(to)) {
      case (null) { 0 };
      case (?b) { b };
    };
    balances.add(to, current + amount);
    totalMinted += amount;
  };

  // --- ICRC-1 Transfer ---
  public shared ({ caller }) func icrc1_transfer(args : {
    to : { owner : Principal; subaccount : ?Blob };
    amount : Nat;
    memo : ?Blob;
    fee : ?Nat;
    from_subaccount : ?Blob;
    created_at_time : ?Nat64;
  }) : async { #Ok : Nat; #Err : Text } {
    let fromBal = switch (balances.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    if (fromBal < args.amount) {
      return #Err("Insufficient balance");
    };
    balances.add(caller, fromBal - args.amount);
    let toBal = switch (balances.get(args.to.owner)) {
      case (null) { 0 };
      case (?b) { b };
    };
    balances.add(args.to.owner, toBal + args.amount);
    #Ok(0);
  };

  // Simple transfer convenience method
  public shared ({ caller }) func transfer(to : Principal, amount : Nat) : async () {
    let fromBal = switch (balances.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    if (fromBal < amount) { Runtime.trap("Insufficient balance") };
    balances.add(caller, fromBal - amount);
    let toBal = switch (balances.get(to)) {
      case (null) { 0 };
      case (?b) { b };
    };
    balances.add(to, toBal + amount);
  };

  // --- ICRC-2 Approve ---
  // M-07 FIX: Now stores expires_at alongside the allowance amount.
  // Previously, expires_at was silently discarded, meaning approvals never expired
  // and could be exploited long after the user intended them to lapse.
  public shared ({ caller }) func icrc2_approve(args : {
    spender : { owner : Principal; subaccount : ?Blob };
    amount : Nat;
    memo : ?Blob;
    fee : ?Nat;
    from_subaccount : ?Blob;
    created_at_time : ?Nat64;
    expires_at : ?Nat64;
  }) : async { #Ok : Nat; #Err : Text } {
    let spenderAllowances = switch (allowances.get(caller)) {
      case (null) {
        let m = Map.empty<Principal, AllowanceEntry>();
        allowances.add(caller, m);
        m;
      };
      case (?m) { m };
    };
    let entry : AllowanceEntry = {
      amount = args.amount;
      expiresAt = args.expires_at;
    };
    spenderAllowances.add(args.spender.owner, entry);
    #Ok(0);
  };

  // Helper: check if an allowance entry is still valid at the current time
  func isAllowanceValid(entry : AllowanceEntry) : Bool {
    switch (entry.expiresAt) {
      case (null) { true }; // no expiry = never expires
      case (?expiresAt) {
        let nowNs = Nat64.fromNat(Int.abs(Time.now()));
        nowNs < expiresAt;
      };
    };
  };

  public query func icrc2_allowance(args : {
    account : { owner : Principal; subaccount : ?Blob };
    spender : { owner : Principal; subaccount : ?Blob };
  }) : async { allowance : Nat; expires_at : ?Nat64 } {
    switch (allowances.get(args.account.owner)) {
      case (null) { { allowance = 0; expires_at = null } };
      case (?m) {
        switch (m.get(args.spender.owner)) {
          case (null) { { allowance = 0; expires_at = null } };
          case (?entry) {
            // Return 0 if expired, actual amount if still valid
            if (isAllowanceValid(entry)) {
              { allowance = entry.amount; expires_at = entry.expiresAt };
            } else {
              { allowance = 0; expires_at = entry.expiresAt };
            };
          };
        };
      };
    };
  };

  // --- ICRC-2 Transfer From ---
  // M-07 FIX: Now enforces expires_at — expired approvals are rejected.
  public shared ({ caller }) func icrc2_transfer_from(args : {
    from : { owner : Principal; subaccount : ?Blob };
    to : { owner : Principal; subaccount : ?Blob };
    amount : Nat;
    memo : ?Blob;
    fee : ?Nat;
    spender_subaccount : ?Blob;
    created_at_time : ?Nat64;
  }) : async { #Ok : Nat; #Err : Text } {
    let fromPrincipal = args.from.owner;
    let entry = switch (allowances.get(fromPrincipal)) {
      case (null) { return #Err("Insufficient allowance") };
      case (?m) {
        switch (m.get(caller)) {
          case (null) { return #Err("Insufficient allowance") };
          case (?e) { e };
        };
      };
    };
    // Reject expired approvals
    if (not isAllowanceValid(entry)) {
      return #Err("Allowance has expired");
    };
    if (entry.amount < args.amount) { return #Err("Insufficient allowance") };
    let fromBal = switch (balances.get(fromPrincipal)) {
      case (null) { 0 };
      case (?b) { b };
    };
    if (fromBal < args.amount) { return #Err("Insufficient balance") };
    // Deduct allowance
    switch (allowances.get(fromPrincipal)) {
      case (?m) {
        m.add(caller, { entry with amount = entry.amount - args.amount });
      };
      case (null) {};
    };
    balances.add(fromPrincipal, fromBal - args.amount);
    let toBal = switch (balances.get(args.to.owner)) {
      case (null) { 0 };
      case (?b) { b };
    };
    balances.add(args.to.owner, toBal + args.amount);
    #Ok(0);
  };

  public query func getAllowance(owner : Principal, spender : Principal) : async Nat {
    switch (allowances.get(owner)) {
      case (null) { 0 };
      case (?m) {
        switch (m.get(spender)) {
          case (null) { 0 };
          case (?entry) {
            if (isAllowanceValid(entry)) { entry.amount } else { 0 };
          };
        };
      };
    };
  };

  // --- Stats ---
  public query func getMiningStats() : async {
    totalMinted : Nat;
    remainingSupply : Nat;
    hardCap : Nat;
  } {
    {
      totalMinted;
      remainingSupply = HARD_CAP - totalMinted;
      hardCap = HARD_CAP;
    };
  };
};
