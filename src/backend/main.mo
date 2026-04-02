import OutCall "http-outcalls/outcall";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Cycles "mo:core/Cycles";
import Time "mo:core/Time";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import Timer "mo:core/Timer";
import Nat64 "mo:core/Nat64";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";

// Channel, Token, and Oracle WASMs auto-generated at build time by their respective scripts
import ChannelWasm "ChannelWasm";
import TokenWasm "TokenWasm";
import OracleWasm "OracleWasm";

// Data migration with-clause

actor Main {
  // Authorization system setup
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  // --- Channel WASM Storage ---
  var channelWasm : ?Blob = ?ChannelWasm.wasm;
  var hyveilPrincipal : ?Principal = null;

  // --- Token System Storage ---
  var oraclePrincipal : ?Principal = null;
  var tokenCanisterId : ?Principal = null;
  var tokenWasm : ?Blob = ?TokenWasm.wasm;
  var oracleWasm : ?Blob = ?OracleWasm.wasm;
  // SECURITY FIX C-02: Mutex prevents concurrent admin calls from both passing the
  // `tokenCanisterId != null` guard before either write completes, causing double deploy.
  var tokenSystemDeploying : Bool = false;

  // --- Auto-refill tracking ---
  let REFILL_THRESHOLD : Nat = 1_000_000_000;
  let REFILL_TARGET : Nat = 1_000_000_000_000;
  let PARTNER_LOW_THRESHOLD : Nat = 200_000_000_000;
  let PARTNER_TOPUP_CYCLES : Nat = 50_000_000_000;
  let PARTNER_TOPUP_FEE : Nat = 100_000_000;

  var lastAutoRefillTime : Int = 0;
  var autoRefillCount : Nat = 0;
  var lastOracleCyclesChecked : Nat = 0;
  var lastTokenCyclesChecked : Nat = 0;

  // --- IC Management Canister Interface ---
  let icManagement = actor ("aaaaa-aa") : actor {
    create_canister : shared ({
      settings : ?{
        controllers : ?[Principal];
        compute_allocation : ?Nat;
        memory_allocation : ?Nat;
        freezing_threshold : ?Nat;
      };
    }) -> async { canister_id : Principal };
    install_code : shared ({
      mode : { #install; #upgrade; #reinstall };
      canister_id : Principal;
      wasm_module : Blob;
      arg : Blob;
    }) -> async ();
  };

  // --- Auto-Refill ---
  func checkAndRefillOwnedCanisters() : async () {
    let ic = actor ("aaaaa-aa") : actor {
      canister_status : shared ({ canister_id : Principal }) -> async {
        status : { #running; #stopping; #stopped };
        cycles : Nat;
        memory_size : Nat;
        module_hash : ?Blob;
      };
      deposit_cycles : shared ({ canister_id : Principal }) -> async ();
    };
    switch (oraclePrincipal) {
      case (?oId) {
        try {
          let status = await ic.canister_status({ canister_id = oId });
          lastOracleCyclesChecked := status.cycles;
          if (status.cycles < REFILL_THRESHOLD) {
            let topUpAmount = REFILL_TARGET - status.cycles;
            await (with cycles = topUpAmount) ic.deposit_cycles({ canister_id = oId });
            autoRefillCount += 1;
            lastAutoRefillTime := Time.now();
          };
        } catch (_) {};
      };
      case (null) {};
    };
    switch (tokenCanisterId) {
      case (?tId) {
        try {
          let status = await ic.canister_status({ canister_id = tId });
          lastTokenCyclesChecked := status.cycles;
          if (status.cycles < REFILL_THRESHOLD) {
            let topUpAmount = REFILL_TARGET - status.cycles;
            await (with cycles = topUpAmount) ic.deposit_cycles({ canister_id = tId });
            autoRefillCount += 1;
            lastAutoRefillTime := Time.now();
          };
        } catch (_) {};
      };
      case (null) {};
    };
  };

  ignore Timer.recurringTimer<system>(
    #seconds(3600),
    func() : async () { await checkAndRefillOwnedCanisters() }
  );

  public shared ({ caller }) func getAutoRefillStatus() : async {
    lastRefillTime : Int;
    totalRefillCount : Nat;
    oracleCycles : Nat;
    tokenCycles : Nat;
    refillThreshold : Nat;
    refillTarget : Nat;
  } {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view auto-refill status");
    };
    {
      lastRefillTime = lastAutoRefillTime;
      totalRefillCount = autoRefillCount;
      oracleCycles = lastOracleCyclesChecked;
      tokenCycles = lastTokenCyclesChecked;
      refillThreshold = REFILL_THRESHOLD;
      refillTarget = REFILL_TARGET;
    };
  };

  public shared ({ caller }) func triggerAutoRefill() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can trigger auto-refill");
    };
    await checkAndRefillOwnedCanisters();
  };

  public shared ({ caller }) func getPartnerCanisterCycles(partnerId : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let partner = switch (partners.get(partnerId)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    if (partner.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only the channel owner or admin can check cycles");
    };
    let ic = actor ("aaaaa-aa") : actor {
      canister_status : shared ({ canister_id : Principal }) -> async {
        status : { #running; #stopping; #stopped };
        cycles : Nat;
        memory_size : Nat;
        module_hash : ?Blob;
      };
    };
    try {
      let status = await ic.canister_status({ canister_id = partner.canisterId });
      status.cycles;
    } catch (_) { 0 };
  };

  public shared ({ caller }) func topUpPartnerCanister(partnerId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can top up canisters");
    };
    let partner = switch (partners.get(partnerId)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    if (partner.owner != caller) {
      Runtime.trap("Unauthorized: Only the channel owner can top up their canister");
    };
    let currentBalance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    if (currentBalance < PARTNER_TOPUP_FEE) {
      Runtime.trap("Insufficient ICP balance. Need 1 ICP (100,000,000 e8s). Deposit ICP first.");
    };
    // C-04: Deduct ICP first; refund if the cycles deposit fails.
    icpBalances.add(caller, currentBalance - PARTNER_TOPUP_FEE);
    let ic = actor ("aaaaa-aa") : actor {
      deposit_cycles : shared ({ canister_id : Principal }) -> async ();
    };
    try {
      await (with cycles = PARTNER_TOPUP_CYCLES) ic.deposit_cycles({ canister_id = partner.canisterId });
    } catch (e) {
      // Refund the fee since no cycles were actually deposited
      let refundBal = switch (icpBalances.get(caller)) { case (null) { 0 }; case (?b) { b } };
      icpBalances.add(caller, refundBal + PARTNER_TOPUP_FEE);
      Runtime.trap("Cycles deposit failed. ICP has been refunded: " # e.message());
    };
  };

  public shared ({ caller }) func setChannelWasm(wasm : Blob) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set channel WASM");
    };
    channelWasm := ?wasm;
  };

  public query func getChannelWasmStatus() : async { loaded : Bool; size : Nat } {
    switch (channelWasm) {
      case (null) { { loaded = false; size = 0 } };
      case (?wasm) { { loaded = true; size = wasm.size() } };
    };
  };

  public shared ({ caller }) func clearChannelWasm() : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can clear channel WASM");
    };
    channelWasm := null;
  };

  public shared ({ caller }) func setHyveilPrincipal(p : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set the HYVEIL principal");
    };
    hyveilPrincipal := ?p;
  };

  public query func getHyveilPrincipal() : async ?Principal {
    hyveilPrincipal;
  };

  public shared ({ caller }) func setOraclePrincipal(p : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set oracle principal");
    };
    oraclePrincipal := ?p;
  };

  public query func getOraclePrincipal() : async ?Principal {
    oraclePrincipal;
  };

  public shared ({ caller }) func setTokenCanisterId(p : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can set token canister ID");
    };
    tokenCanisterId := ?p;
  };

  public query func getTokenCanisterId() : async ?Principal {
    tokenCanisterId;
  };

  public query func getTokenSystemStatus() : async {
    tokenDeployed : Bool;
    oracleDeployed : Bool;
    tokenCanisterId : ?Principal;
    oracleCanisterId : ?Principal;
    tokenWasmLoaded : Bool;
    oracleWasmLoaded : Bool;
  } {
    {
      tokenDeployed = tokenCanisterId != null;
      oracleDeployed = oraclePrincipal != null;
      tokenCanisterId = tokenCanisterId;
      oracleCanisterId = oraclePrincipal;
      tokenWasmLoaded = tokenWasm != null;
      oracleWasmLoaded = oracleWasm != null;
    };
  };

  public shared ({ caller }) func deployTokenSystem() : async {
    tokenCanisterId : Principal;
    oracleCanisterId : Principal;
  } {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can deploy the token system");
    };
    if (tokenCanisterId != null) {
      Runtime.trap("Token system already deployed");
    };
    // C-02: Mutex prevents a second concurrent call from passing the guard above
    // before the first one writes tokenCanisterId.
    if (tokenSystemDeploying) {
      Runtime.trap("Token system deployment already in progress");
    };
    tokenSystemDeploying := true;
    let tWasm = switch (tokenWasm) {
      case (null) { Runtime.trap("Token WASM not loaded") };
      case (?w) { w };
    };
    let oWasm = switch (oracleWasm) {
      case (null) { Runtime.trap("Oracle WASM not loaded") };
      case (?w) { w };
    };
    let { canister_id = newTokenId } = await (
      with cycles = 50_000_000_000
    ) icManagement.create_canister({
      settings = ?{
        controllers = ?[Principal.fromActor(Main)];
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      };
    });
    await icManagement.install_code({
      mode = #install;
      canister_id = newTokenId;
      wasm_module = tWasm;
      arg = Blob.fromArray([]);
    });
    let { canister_id = newOracleId } = await (
      with cycles = 50_000_000_000
    ) icManagement.create_canister({
      settings = ?{
        controllers = ?[Principal.fromActor(Main)];
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      };
    });
    await icManagement.install_code({
      mode = #install;
      canister_id = newOracleId;
      wasm_module = oWasm;
      arg = Blob.fromArray([]);
    });
    type TokenInitActor = actor {
      initAdmin : () -> async ();
      setOracle : (Principal) -> async ();
    };
    type OracleInitActor = actor {
      initAdmin : () -> async ();
      setTokenCanister : (Principal) -> async ();
    };
    let tokenActor : TokenInitActor = actor (newTokenId.toText());
    await tokenActor.initAdmin();
    await tokenActor.setOracle(newOracleId);
    let oracleActor : OracleInitActor = actor (newOracleId.toText());
    await oracleActor.initAdmin();
    await oracleActor.setTokenCanister(newTokenId);
    tokenCanisterId := ?newTokenId;
    oraclePrincipal := ?newOracleId;
    tokenSystemDeploying := false;
    { tokenCanisterId = newTokenId; oracleCanisterId = newOracleId };
  };

  type ChannelActor = actor {
    initialize : (Principal, Principal, Text, Text) -> async ();
  };

  type OracleActor = actor {
    registerChannel : (Principal, Principal) -> async ();
  };

  type TokenActor = actor {
    balanceOf : (Principal) -> async Nat;
  };

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type PartnerStatus = {
    #pending;
    #approved;
    #revoked;
  };

  public type PartnerRecord = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    website : Text;
    canisterId : Principal;
    status : PartnerStatus;
    registeredAt : Int;
    chains : [Text];
    monetizationModel : Text;
    totalRevenue : Nat;
  };

  public type CanisterFactoryResponse = {
    canisterId : Principal;
    partnerId : Nat;
  };

  // --- ICP Ledger interface (ICRC-2 + ICRC-1 transfer for withdrawals) ---
  let icpLedger = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
    icrc2_transfer_from : shared ({
      spender_subaccount : ?Blob;
      from : { owner : Principal; subaccount : ?Blob };
      to : { owner : Principal; subaccount : ?Blob };
      amount : Nat;
      fee : ?Nat;
      memo : ?Blob;
      created_at_time : ?Nat64;
    }) -> async {
      #Ok : Nat;
      #Err : {
        #BadFee : { expected_fee : Nat };
        #BadBurn : { min_burn_amount : Nat };
        #InsufficientFunds : { balance : Nat };
        #InsufficientAllowance : { allowance : Nat };
        #TooOld;
        #CreatedInFuture : { ledger_time : Nat64 };
        #Duplicate : { duplicate_of : Nat };
        #TemporarilyUnavailable;
        #GenericError : { error_code : Nat; message : Text };
      };
    };
  };

  var nextPartnerId = 1;
  let partners = Map.empty<Nat, PartnerRecord>();
  let icpBalances = Map.empty<Principal, Nat>();

  public shared ({ caller }) func depositIcp(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can deposit ICP");
    };
    let result = await icpLedger.icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = caller; subaccount = null };
      to = { owner = Principal.fromActor(Main); subaccount = null };
      amount = amount;
      fee = ?10_000;
      memo = null;
      created_at_time = null;
    });
    switch (result) {
      case (#Ok(_)) {
        let currentBalance = switch (icpBalances.get(caller)) {
          case (null) { 0 };
          case (?balance) { balance };
        };
        icpBalances.add(caller, currentBalance + amount);
      };
      case (#Err(#InsufficientFunds({ balance }))) {
        Runtime.trap("Insufficient ICP balance on ledger. Available: " # balance.toText() # " e8s");
      };
      case (#Err(#InsufficientAllowance({ allowance }))) {
        Runtime.trap("Insufficient allowance. Please approve HYVEIL to spend your ICP first. Current allowance: " # allowance.toText() # " e8s");
      };
      case (#Err(#BadFee({ expected_fee }))) {
        Runtime.trap("Bad fee. Expected: " # expected_fee.toText() # " e8s");
      };
      case (#Err(_)) {
        Runtime.trap("ICP transfer from ledger failed. Check your ICP balance and allowance.");
      };
    };
  };

  public query func getRegistrationFee() : async Nat {
    100_000_000;
  };

  public query ({ caller }) func getMyIcpBalance() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their ICP balance");
    };
    switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
  };

  // --- Creator Earnings Withdrawal ---
  // Creators accumulate 90% of content purchase revenue in icpBalances.
  // This function transfers their earnings out to their own wallet on the ICP ledger.
  public shared ({ caller }) func withdrawEarnings(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can withdraw earnings");
    };
    if (amount == 0) { Runtime.trap("Amount must be greater than 0") };
    let fee : Nat = 10_000; // ICP transfer fee
    let balance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?b) { b };
    };
    if (balance < amount + fee) {
      Runtime.trap("Insufficient earnings balance. Available: " # balance.toText() # " e8s, requested: " # amount.toText() # " e8s + " # fee.toText() # " e8s fee");
    };
    // Deduct first to prevent double-spend
    icpBalances.add(caller, balance - amount - fee);
    // Transfer ICP to caller's wallet via a separate actor reference
    // (icpLedger is kept to its original type for upgrade compatibility)
    let icpLedgerTransfer = actor("ryjl3-tyaaa-aaaaa-aaaba-cai") : actor {
      icrc1_transfer : shared ({
        from_subaccount : ?Blob;
        to : { owner : Principal; subaccount : ?Blob };
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
      }) -> async {
        #Ok : Nat;
        #Err : {
          #BadFee : { expected_fee : Nat };
          #BadBurn : { min_burn_amount : Nat };
          #InsufficientFunds : { balance : Nat };
          #TooOld;
          #CreatedInFuture : { ledger_time : Nat64 };
          #Duplicate : { duplicate_of : Nat };
          #TemporarilyUnavailable;
          #GenericError : { error_code : Nat; message : Text };
        };
      };
    };
    let result = await icpLedgerTransfer.icrc1_transfer({
      from_subaccount = null;
      to = { owner = caller; subaccount = null };
      amount = amount;
      fee = ?fee;
      memo = null;
      created_at_time = null;
    });
    switch (result) {
      case (#Ok(_)) {};
      case (#Err(_)) {
        // Restore balance on failure
        let currentBal = switch (icpBalances.get(caller)) {
          case (null) { 0 };
          case (?b) { b };
        };
        icpBalances.add(caller, currentBal + amount + fee);
        Runtime.trap("ICP withdrawal transfer failed. Earnings have been restored.");
      };
    };
  };

  public type RegisterPartnerInput = {
    name : Text;
    description : Text;
    website : Text;
    chains : [Text];
  };

  public shared ({ caller }) func registerPartner(input : RegisterPartnerInput) : async PartnerRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register partners. Create a user profile first.");
    };
    let wasm = switch (channelWasm) {
      case (null) { Runtime.trap("Channel WASM not loaded. Admin must call setChannelWasm first.") };
      case (?w) { w };
    };
    let registrationFee = 100_000_000;
    let currentBalance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    if (currentBalance < registrationFee) {
      Runtime.trap("Insufficient ICP balance for registration. You have " # currentBalance.toText() # " e8s, need " # registrationFee.toText() # " e8s. Deposit ICP first.");
    };
    // C-03: Deduct ICP before awaits. If deployment fails, we refund below.
    let newBalance = currentBalance - registrationFee : Nat;
    icpBalances.add(caller, newBalance);
    let treasury = switch (hyveilPrincipal) {
      case (?p) { p };
      case (null) { Principal.fromActor(Main) };
    };
    let newCanisterId = try {
      let { canister_id } = await (
        with cycles = 50_000_000_000
      ) icManagement.create_canister({
        settings = ?{
          controllers = ?[Principal.fromActor(Main)];
          compute_allocation = null;
          memory_allocation = null;
          freezing_threshold = null;
        };
      });
      canister_id;
    } catch (e) {
      // Refund registration fee on create_canister failure
      let refundBal = switch (icpBalances.get(caller)) { case (null) { 0 }; case (?b) { b } };
      icpBalances.add(caller, refundBal + registrationFee);
      Runtime.trap("Failed to create partner canister: " # e.message());
    };
    try {
      await icManagement.install_code({
        mode = #install;
        canister_id = newCanisterId;
        wasm_module = wasm;
        arg = Blob.fromArray([]);
      });
    } catch (e) {
      let refundBal = switch (icpBalances.get(caller)) { case (null) { 0 }; case (?b) { b } };
      icpBalances.add(caller, refundBal + registrationFee);
      Runtime.trap("Failed to install channel WASM: " # e.message());
    };
    let channelActor : ChannelActor = actor (newCanisterId.toText());
    try {
      await channelActor.initialize(caller, treasury, input.name, input.description);
    } catch (e) {
      // Channel init failed but canister is already deployed — do not refund,
      // admin can call initialize manually. Record partner anyway.
    };
    let partnerId = nextPartnerId;
    nextPartnerId += 1;
    let newPartner : PartnerRecord = {
      id = partnerId;
      owner = caller;
      name = input.name;
      description = input.description;
      website = "https://" # newCanisterId.toText() # ".icp0.io";
      canisterId = newCanisterId;
      status = #approved;
      registeredAt = Time.now();
      chains = input.chains;
      monetizationModel = "payPerView";
      totalRevenue = 0;
    };
    partners.add(partnerId, newPartner);
    switch (oraclePrincipal) {
      case (?oraclePrincipalId) {
        try {
          let oracle : OracleActor = actor (oraclePrincipalId.toText());
          await oracle.registerChannel(newCanisterId, caller);
        } catch (e) {};
      };
      case (null) {};
    };
    newPartner;
  };

  public shared ({ caller }) func registerChannelForMining(channelId : Principal, ownerPrincipal : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can manually register channels for mining");
    };
    switch (oraclePrincipal) {
      case (null) { Runtime.trap("Oracle principal not set") };
      case (?oraclePrincipalId) {
        let oracle : OracleActor = actor (oraclePrincipalId.toText());
        await oracle.registerChannel(channelId, ownerPrincipal);
      };
    };
  };

  public shared func getHyvBalance(principal : Principal) : async Nat {
    switch (tokenCanisterId) {
      case (null) { 0 };
      case (?tId) {
        try {
          let tokenActor2 : TokenActor = actor (tId.toText());
          await tokenActor2.balanceOf(principal);
        } catch (_) { 0 };
      };
    };
  };

  public query ({ caller }) func getPartners() : async [PartnerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view the partner registry");
    };
    partners.values().toArray();
  };

  public query func getApprovedPartners() : async [PartnerRecord] {
    partners.values().filter(
      func(p : PartnerRecord) : Bool { p.status == #approved }
    ).toArray();
  };

  public query ({ caller }) func getMyPartners() : async [PartnerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their partners");
    };
    partners.values().filter(
      func(p : PartnerRecord) : Bool { p.owner == caller }
    ).toArray();
  };

  public shared ({ caller }) func approvePartner(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can approve partners");
    };
    let partner = switch (partners.get(id)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    partners.add(id, { partner with status = #approved });
  };

  public shared ({ caller }) func revokePartner(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can revoke partners");
    };
    let partner = switch (partners.get(id)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    partners.add(id, { partner with status = #revoked });
  };

  public type ContentItem = {
    id : Text;
    partnerId : Nat;
    title : Text;
    description : Text;
    priceE8s : Nat;
    contentType : Text;
    createdAt : Int;
  };

  var nextContentId = 1;
  let contentItems = Map.empty<Text, ContentItem>();

  public shared ({ caller }) func addContentItem(
    partnerId : Nat,
    title : Text,
    description : Text,
    priceE8s : Nat,
    contentType : Text
  ) : async ContentItem {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can add content items");
    };
    let partner = switch (partners.get(partnerId)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    if (partner.owner != caller) {
      Runtime.trap("Unauthorized: Only the partner owner can add content items");
    };
    if (contentType != "payPerView" and contentType != "subscription") {
      Runtime.trap("Invalid content type");
    };
    let contentId = nextContentId.toText();
    nextContentId += 1;
    let newContent : ContentItem = {
      id = contentId; partnerId; title; description; priceE8s; contentType;
      createdAt = Time.now();
    };
    contentItems.add(contentId, newContent);
    newContent;
  };

  public query ({ caller }) func getContentItems(partnerId : Nat) : async [ContentItem] {
    contentItems.values().filter(
      func(item : ContentItem) : Bool { item.partnerId == partnerId }
    ).toArray();
  };

  public type PurchaseRecord = {
    id : Nat;
    buyer : Principal;
    contentId : Text;
    partnerId : Nat;
    totalAmountE8s : Nat;
    creatorShareE8s : Nat;
    hyveilShareE8s : Nat;
    timestamp : Int;
  };

  var nextPurchaseId = 1;
  let purchases = Map.empty<Nat, PurchaseRecord>();

  // SECURITY FIX: purchaseContent now pulls real ICP from the buyer via icrc2_transfer_from
  // before recording the purchase. This closes the free-purchase exploit where anyone could
  // call this function without paying and inflate creator revenue + social mining scores.
  // Also prevents duplicate purchases of the same content item.
  public shared ({ caller }) func purchaseContent(contentId : Text) : async PurchaseRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can purchase content");
    };
    let content = switch (contentItems.get(contentId)) {
      case (null) { Runtime.trap("Content not found") };
      case (?c) { c };
    };
    if (content.priceE8s == 0) {
      Runtime.trap("This content is free — no purchase required");
    };
    // Prevent duplicate purchases
    let alreadyBought = purchases.values().filter(
      func(p : PurchaseRecord) : Bool { p.buyer == caller and p.contentId == contentId }
    ).toArray().size() > 0;
    if (alreadyBought) {
      Runtime.trap("You have already purchased this content");
    };
    // Pull real ICP from buyer. Buyer must have called icrc2_approve on the ICP ledger first.
    let payResult = await icpLedger.icrc2_transfer_from({
      spender_subaccount = null;
      from = { owner = caller; subaccount = null };
      to = { owner = Principal.fromActor(Main); subaccount = null };
      amount = content.priceE8s;
      fee = ?10_000;
      memo = null;
      created_at_time = null;
    });
    switch (payResult) {
      case (#Err(#InsufficientFunds({ balance }))) {
        Runtime.trap("Insufficient ICP balance. Available: " # balance.toText() # " e8s, required: " # content.priceE8s.toText() # " e8s");
      };
      case (#Err(#InsufficientAllowance({ allowance }))) {
        Runtime.trap("Payment not pre-approved. Approve HYVEIL to spend " # content.priceE8s.toText() # " e8s on the ICP ledger first.");
      };
      case (#Err(_)) {
        Runtime.trap("ICP payment failed. Check your balance and approval on the ICP ledger.");
      };
      case (#Ok(_)) {}; // Payment confirmed on-chain, proceed
    };
    let totalAmount = content.priceE8s;
    let creatorShare = (totalAmount * 90) / 100;
    let hyveilShare = totalAmount - creatorShare : Nat;
    let purchaseId = nextPurchaseId;
    nextPurchaseId += 1;
    let purchase : PurchaseRecord = {
      id = purchaseId; buyer = caller; contentId;
      partnerId = content.partnerId; totalAmountE8s = totalAmount;
      creatorShareE8s = creatorShare; hyveilShareE8s = hyveilShare;
      timestamp = Time.now();
    };
    purchases.add(purchaseId, purchase);
    let partner = switch (partners.get(content.partnerId)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    partners.add(content.partnerId, { partner with totalRevenue = partner.totalRevenue + totalAmount });
    // Credit creator's 90% share to their withdrawable earnings balance
    let creatorBalance = switch (icpBalances.get(partner.owner)) {
      case (null) { 0 };
      case (?b) { b };
    };
    icpBalances.add(partner.owner, creatorBalance + creatorShare);
    purchase;
  };

  // Check if caller has already purchased a specific content item
  public query ({ caller }) func hasPurchased(contentId : Text) : async Bool {
    purchases.values().filter(
      func(p : PurchaseRecord) : Bool { p.buyer == caller and p.contentId == contentId }
    ).toArray().size() > 0;
  };

  public type RevenueStats = {
    totalRevenue : Nat;
    creatorShare : Nat;
    hyveilShare : Nat;
    purchaseCount : Nat;
  };

  public query ({ caller }) func getPartnerRevenue(partnerId : Nat) : async RevenueStats {
    let partnerPurchases = purchases.values().filter(
      func(p : PurchaseRecord) : Bool { p.partnerId == partnerId }
    ).toArray();
    var totalRevenue = 0; var creatorShare = 0; var hyveilShare = 0;
    for (purchase in partnerPurchases.vals()) {
      totalRevenue += purchase.totalAmountE8s;
      creatorShare += purchase.creatorShareE8s;
      hyveilShare += purchase.hyveilShareE8s;
    };
    { totalRevenue; creatorShare; hyveilShare; purchaseCount = partnerPurchases.size() };
  };

  public type ChannelRevenue = {
    partnerId : Nat;
    partnerName : Text;
    canisterId : Principal;
    totalRevenue : Nat;
    creatorShare : Nat;
    hyveilShare : Nat;
    purchaseCount : Nat;
  };

  public query ({ caller }) func getMyChannelsRevenue() : async [ChannelRevenue] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their channel revenue");
    };
    let myPartners = partners.values().filter(
      func(p : PartnerRecord) : Bool { p.owner == caller }
    ).toArray();
    myPartners.map<PartnerRecord, ChannelRevenue>(
      func(partner : PartnerRecord) : ChannelRevenue {
        let pp = purchases.values().filter(
          func(p : PurchaseRecord) : Bool { p.partnerId == partner.id }
        ).toArray();
        var totalRevenue = 0; var creatorShare = 0; var hyveilShare = 0;
        for (p in pp.vals()) {
          totalRevenue += p.totalAmountE8s;
          creatorShare += p.creatorShareE8s;
          hyveilShare += p.hyveilShareE8s;
        };
        { partnerId = partner.id; partnerName = partner.name; canisterId = partner.canisterId;
          totalRevenue; creatorShare; hyveilShare; purchaseCount = pp.size() };
      }
    );
  };

  public type PlatformRevenue = {
    totalRevenue : Nat;
    totalCreatorShare : Nat;
    totalHyveilShare : Nat;
    totalPurchases : Nat;
    partnerCount : Nat;
  };

  public query ({ caller }) func getAllPartnersRevenue() : async PlatformRevenue {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can view platform-wide revenue");
    };
    let allPurchases = purchases.values().toArray();
    var totalRevenue = 0; var totalCreatorShare = 0; var totalHyveilShare = 0;
    for (purchase in allPurchases.vals()) {
      totalRevenue += purchase.totalAmountE8s;
      totalCreatorShare += purchase.creatorShareE8s;
      totalHyveilShare += purchase.hyveilShareE8s;
    };
    { totalRevenue; totalCreatorShare; totalHyveilShare;
      totalPurchases = allPurchases.size(); partnerCount = partners.size() };
  };

  public shared ({ caller }) func setMonetizationModel(partnerId : Nat, model : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can change monetization model");
    };
    let partner = switch (partners.get(partnerId)) {
      case (null) { Runtime.trap("Partner not found") };
      case (?p) { p };
    };
    if (partner.owner != caller) {
      Runtime.trap("Unauthorized: Only the partner owner can change the monetization model");
    };
    if (model != "payPerView" and model != "subscription") {
      Runtime.trap("Invalid monetization model");
    };
    partners.add(partnerId, { partner with monetizationModel = model });
  };

  public shared ({ caller }) func claimOwnerIfFirst() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (accessControlState.adminAssigned) { return false };
    accessControlState.adminAssigned := true;
    accessControlState.userRoles.add(caller, #admin);
    true;
  };

  type ProxyResponse = {
    statusCode : Nat;
    body : Text;
    success : Bool;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  func convertHeaders(headers : [(Text, Text)]) : [OutCall.Header] {
    headers.map<(Text, Text), OutCall.Header>(
      func(tuple : (Text, Text)) : OutCall.Header { { name = tuple.0; value = tuple.1 } }
    );
  };

  // SECURITY FIX H-03: URL allowlist prevents SSRF against internal ICP endpoints.
  // Body size cap (32 KB) prevents cycle-drain via huge POST payloads (~49M cycles/outcall).
  // Only authenticated users may call this function (unauthenticated users have no reason to).
  let PROXY_ALLOWED_PREFIXES : [Text] = [
    "https://httpbin.org/",
    "https://youtube.com/",
    "https://www.youtube.com/",
    "https://reddit.com/",
    "https://www.reddit.com/",
    "https://twitter.com/",
    "https://x.com/",
    "https://api.twitter.com/",
    "https://wikipedia.org/",
    "https://en.wikipedia.org/",
    "https://github.com/",
    "https://api.github.com/",
    "https://medium.com/",
    "https://news.ycombinator.com/",
    "https://arxiv.org/",
    "https://netflix.com/",
    "https://www.netflix.com/",
    "https://icp-api.io/",
  ];
  let PROXY_MAX_BODY_BYTES : Nat = 32_768; // 32 KB

  func isAllowedProxyUrl(url : Text) : Bool {
    for (prefix in PROXY_ALLOWED_PREFIXES.vals()) {
      if (url.size() >= prefix.size()) {
        // Compare first prefix.size() characters
        let urlSlice = url.chars();
        let prefixSlice = prefix.chars();
        var match = true;
        var i = 0;
        label check for (pc in prefixSlice) {
          switch (urlSlice.next()) {
            case (?uc) {
              if (uc != pc) { match := false; break check };
            };
            case (null) { match := false; break check };
          };
          i += 1;
        };
        if (match) return true;
      };
    };
    false;
  };

  public shared ({ caller }) func proxyFetch(url : Text, method : Text, body : ?Text, extraHeaders : ?[(Text, Text)]) : async ProxyResponse {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return { statusCode = 401; body = "Unauthorized: Must be logged in to use the proxy"; success = false };
    };
    if (not isAllowedProxyUrl(url)) {
      return { statusCode = 403; body = "URL not allowed. Only permitted web2 sites are accessible via proxy."; success = false };
    };
    switch (body) {
      case (?b) {
        if (b.size() > PROXY_MAX_BODY_BYTES) {
          return { statusCode = 413; body = "Request body too large. Maximum size is 32 KB."; success = false };
        };
      };
      case (null) {};
    };
    try {
      let headers : [OutCall.Header] = switch (extraHeaders) {
        case (null) { [] };
        case (?h) { convertHeaders(h) };
      };
      if (method == "GET") {
        let response = await OutCall.httpGetRequest(url, headers, transform);
        { statusCode = 200; body = response; success = true };
      } else if (method == "POST") {
        switch (body) {
          case (?b) {
            let response = await OutCall.httpPostRequest(url, headers, b, transform);
            { statusCode = 200; body = response; success = true };
          };
          case (null) {
            { statusCode = 400; body = "POST body is required"; success = false };
          };
        };
      } else {
        { statusCode = 400; body = "Only GET and POST methods are supported"; success = false };
      };
    } catch (e) {
      { statusCode = 500; body = "Error during HTTP outcall: " # e.message(); success = false };
    };
  };

  public type VideoMeta = {
    id : Text;
    title : Text;
    caption : Text;
    blobId : Text;
    uploadedAt : Nat;
    likes : Nat;
    comments : [Comment];
  };

  public type Comment = {
    author : Principal;
    text : Text;
    createdAt : Int;
  };

  let videos = Map.empty<Text, VideoMeta>();
  // SECURITY FIX: Track which principals have liked which videos to prevent
  // the same user from liking the same video multiple times (bot inflation).
  let videoLikes = Map.empty<Text, Map.Map<Principal, Bool>>();

  public shared ({ caller }) func saveVideoMeta(meta : VideoMeta) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can save video metadata");
    };
    videos.add(meta.id, meta);
  };

  func compareByTimestamp(a : Nat, b : Nat) : { #less; #equal; #greater } {
    if (b > a) { #less } else if (b == a) { #equal } else { #greater };
  };

  func compareVideoByTime(a : VideoMeta, b : VideoMeta) : { #less; #equal; #greater } {
    compareByTimestamp(a.uploadedAt, b.uploadedAt);
  };

  public query func getVideos() : async [VideoMeta] {
    videos.values().toArray().sort(compareVideoByTime);
  };

  public shared ({ caller }) func likeVideo(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can like videos");
    };
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        // Check if already liked by this principal
        let alreadyLiked = switch (videoLikes.get(id)) {
          case (null) { false };
          case (?likersMap) {
            switch (likersMap.get(caller)) {
              case (null) { false };
              case (?_) { true };
            };
          };
        };
        if (alreadyLiked) { Runtime.trap("You have already liked this video") };
        // Record the like
        let likersMap = switch (videoLikes.get(id)) {
          case (null) {
            let m = Map.empty<Principal, Bool>();
            videoLikes.add(id, m);
            m;
          };
          case (?m) { m };
        };
        likersMap.add(caller, true);
        videos.add(id, { video with likes = video.likes + 1 });
      };
    };
  };

  public shared ({ caller }) func addComment(id : Text, text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can comment");
    };
    switch (videos.get(id)) {
      case (null) { Runtime.trap("Video not found") };
      case (?video) {
        let newComment : Comment = { author = caller; text; createdAt = Time.now() };
        videos.add(id, { video with comments = video.comments.concat([newComment]) });
      };
    };
  };

  public query func getHyveilCyclesBalance() : async Nat {
    Cycles.balance();
  };

  // --- CMC Integration ---
  let cmc = actor("rkp4c-7iaaa-aaaaa-aaaca-cai") : actor {
    notify_top_up : shared ({
      canister_id : Principal;
      block_index : Nat64;
    }) -> async {
      #Ok : Nat;
      #Err : {
        #Refunded : { block_index : ?Nat64; reason : Text };
        #InvalidTransaction : Text;
        #Other : { error_code : Nat64; error_message : Text };
        #Processing;
        #TransactionTooOld : Nat64;
      };
    };
    get_icp_xdr_conversion_rate : shared query () -> async {
      data : { xdr_permyriad_per_icp : Nat64; timestamp_seconds : Nat64 };
      certificate : Blob;
    };
  };

  var cachedXdrPermyriadPerIcp : Nat64 = 0;
  var cachedRateTimestamp : Nat64 = 0;

  public shared ({ caller }) func notifyTopUp(blockIndex : Nat64) : async Nat {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can call notifyTopUp");
    };
    let result = await cmc.notify_top_up({
      canister_id = Principal.fromActor(Main);
      block_index = blockIndex;
    });
    switch (result) {
      case (#Ok(cyclesAdded)) { cyclesAdded };
      case (#Err(#Refunded({ reason; block_index = _ }))) {
        Runtime.trap("CMC refunded: " # reason);
      };
      case (#Err(#InvalidTransaction(msg))) {
        Runtime.trap("Invalid transaction: " # msg);
      };
      case (#Err(#Other({ error_message; error_code = _ }))) {
        Runtime.trap("CMC error: " # error_message);
      };
      case (#Err(#Processing)) {
        Runtime.trap("CMC is still processing this transaction. Try again later.");
      };
      case (#Err(#TransactionTooOld(_))) {
        Runtime.trap("Transaction is too old for CMC to process.");
      };
    };
  };

  public shared func getIcpXdrConversionRate() : async {
    xdrPermyriadPerIcp : Nat64;
    timestampSeconds : Nat64;
  } {
    let rateResult = await cmc.get_icp_xdr_conversion_rate();
    cachedXdrPermyriadPerIcp := rateResult.data.xdr_permyriad_per_icp;
    cachedRateTimestamp := rateResult.data.timestamp_seconds;
    { xdrPermyriadPerIcp = cachedXdrPermyriadPerIcp; timestampSeconds = cachedRateTimestamp };
  };

  public query func getCachedIcpXdrRate() : async {
    xdrPermyriadPerIcp : Nat64;
    timestampSeconds : Nat64;
  } {
    { xdrPermyriadPerIcp = cachedXdrPermyriadPerIcp; timestampSeconds = cachedRateTimestamp };
  };
};
