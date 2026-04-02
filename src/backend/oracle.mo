import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Timer "mo:core/Timer";

/// HYV Mining Oracle — Proof of Social Work
/// BTC-like halving: starts at 273_900_000_000 e8s/day (~2739 HYV)
/// Halves every 1460 oracle cycles (4 years of daily cycles)
actor Oracle {
  let INITIAL_DAILY_MINT : Nat = 273_900_000_000;
  let HALVING_INTERVAL : Nat = 1460;
  let HARD_CAP : Nat = 2_100_000_000_000_000;

  var admin : ?Principal = null;
  var tokenCanisterId : ?Principal = null;
  var totalOracleCycles : Nat = 0;
  var totalMintedByOracle : Nat = 0;

  // SECURITY: Mutex flag prevents concurrent oracle cycles from racing to mint
  // past the 21M hard cap (C-06 / C-07 TOCTOU fix).
  var oracleCycleRunning : Bool = false;

  let channelRegistry = Map.empty<Principal, Principal>();
  let creatorHyvMined = Map.empty<Principal, Nat>();

  type ChannelActor = actor {
    getSocialMetrics : () -> async {
      uploads : Nat;
      views : Nat;
      followers : Nat;
      sales : Nat;
      subscriptions : Nat;
    };
  };

  type TokenActor = actor {
    mint : (Principal, Nat) -> async ();
  };

  // --- Admin Setup ---
  public shared ({ caller }) func initAdmin() : async () {
    switch (admin) {
      case (?_) { Runtime.trap("Admin already set") };
      case (null) { admin := ?caller };
    };
  };

  public shared ({ caller }) func setTokenCanister(p : Principal) : async () {
    requireAdmin(caller);
    tokenCanisterId := ?p;
  };

  func requireAdmin(caller : Principal) {
    switch (admin) {
      case (null) { Runtime.trap("Admin not set") };
      case (?a) {
        if (caller != a) { Runtime.trap("Unauthorized: Admin only") };
      };
    };
  };

  // --- Channel Registry ---
  // SECURITY: Removed the `case (null) {}` bypass that allowed anyone to register
  // channels before initAdmin() was called. Now always requires admin authorization.
  public shared ({ caller }) func registerChannel(channelId : Principal, ownerPrincipal : Principal) : async () {
    switch (admin) {
      case (null) {
        Runtime.trap("Oracle not initialized. Admin must call initAdmin first.");
      };
      case (?a) {
        if (caller != a) {
          Runtime.trap("Unauthorized: Only admin (HYVEIL main canister) can register channels");
        };
      };
    };
    channelRegistry.add(channelId, ownerPrincipal);
  };

  public shared ({ caller }) func deregisterChannel(channelId : Principal) : async () {
    requireAdmin(caller);
    ignore channelRegistry.remove(channelId);
  };

  public query func getRegisteredChannels() : async [(Principal, Principal)] {
    channelRegistry.entries().toArray();
  };

  // --- Halving Logic ---
  func getCurrentDailyMint() : Nat {
    let halvings = totalOracleCycles / HALVING_INTERVAL;
    var amount = INITIAL_DAILY_MINT;
    var i = 0;
    while (i < halvings and amount > 0) {
      amount := amount / 2;
      i += 1;
    };
    amount;
  };

  // --- Social Score Formula ---
  func calcScore(metrics : {
    uploads : Nat;
    views : Nat;
    followers : Nat;
    sales : Nat;
    subscriptions : Nat;
  }) : Nat {
    let viewScore = (metrics.views / 100) * 5;
    (metrics.uploads * 10) + viewScore + (metrics.followers * 2) + (metrics.sales * 15) + (metrics.subscriptions * 20);
  };

  // --- Oracle Cycle ---
  // SECURITY FIX C-01: Always require admin auth — removed the `case (null) {}` bypass.
  // SECURITY FIX C-06: Mutex guard (oracleCycleRunning) prevents two concurrent invocations
  // from both passing the hard-cap check before either writes totalMintedByOracle, which
  // would allow minting 2× the intended daily pool and exceeding the 21M cap.
  public shared ({ caller }) func runOracleCycle() : async Text {
    // C-01: Always require admin — no bypass when admin is null
    switch (admin) {
      case (null) {
        Runtime.trap("Oracle not initialized. Call initAdmin first.");
      };
      case (?a) {
        if (caller != a and caller != Principal.fromActor(Oracle)) {
          Runtime.trap("Unauthorized: Admin or timer only");
        };
      };
    };

    // C-06: Prevent concurrent oracle cycles from racing past hard cap
    if (oracleCycleRunning) {
      return "Oracle cycle already in progress. Try again later.";
    };
    oracleCycleRunning := true;

    let result = await runOracleCycleInternal();
    oracleCycleRunning := false;
    result;
  };

  func runOracleCycleInternal() : async Text {
    let tokenId = switch (tokenCanisterId) {
      case (null) { return "Token canister not set" };
      case (?t) { t };
    };

    let dailyMint = getCurrentDailyMint();
    if (dailyMint == 0) { return "Daily mint is 0 (all HYV mined)" };
    if (totalMintedByOracle >= HARD_CAP) { return "Hard cap reached" };

    let channels = channelRegistry.entries().toArray();
    if (channels.size() == 0) {
      totalOracleCycles += 1;
      return "No channels registered";
    };

    let tokenActor : TokenActor = actor (tokenId.toText());
    var totalScore : Nat = 0;
    let scores = Map.empty<Principal, Nat>();

    for ((channelId, ownerPrincipal) in channels.vals()) {
      try {
        let channelActor : ChannelActor = actor (channelId.toText());
        let metrics = await channelActor.getSocialMetrics();
        let score = calcScore(metrics);
        let existing = switch (scores.get(ownerPrincipal)) {
          case (null) { 0 };
          case (?s) { s };
        };
        scores.add(ownerPrincipal, existing + score);
        totalScore += score;
      } catch (e) {};
    };

    if (totalScore == 0) {
      totalOracleCycles += 1;
      return "No social activity recorded";
    };

    // C-06: Re-check hard cap after awaits (other interleaved calls may have advanced it)
    let remainingCap = if (totalMintedByOracle >= HARD_CAP) { 0 } else { HARD_CAP - totalMintedByOracle };
    let actualMint = Nat.min(dailyMint, remainingCap);
    if (actualMint == 0) { return "Hard cap reached after awaits" };

    var distributed : Nat = 0;

    for ((ownerPrincipal, score) in scores.entries()) {
      let share = (actualMint * score) / totalScore;
      if (share > 0) {
        try {
          await tokenActor.mint(ownerPrincipal, share);
          let prev = switch (creatorHyvMined.get(ownerPrincipal)) {
            case (null) { 0 };
            case (?n) { n };
          };
          creatorHyvMined.add(ownerPrincipal, prev + share);
          distributed += share;
        } catch (e) {};
      };
    };

    totalMintedByOracle += distributed;
    totalOracleCycles += 1;

    "Oracle cycle " # totalOracleCycles.toText() # " complete. Distributed: " # distributed.toText() # " e8s to " # scores.size().toText() # " creators.";
  };

  // --- Stats & Leaderboard ---
  public query func getOracleStats() : async {
    totalOracleCycles : Nat;
    totalMintedByOracle : Nat;
    currentDailyMint : Nat;
    nextHalvingIn : Nat;
    hardCap : Nat;
    channelCount : Nat;
  } {
    let cyclesInCurrentEpoch = totalOracleCycles % HALVING_INTERVAL;
    {
      totalOracleCycles;
      totalMintedByOracle;
      currentDailyMint = getCurrentDailyMint();
      nextHalvingIn = HALVING_INTERVAL - cyclesInCurrentEpoch;
      hardCap = HARD_CAP;
      channelCount = channelRegistry.size();
    };
  };

  public query func getCreatorMined(creator : Principal) : async Nat {
    switch (creatorHyvMined.get(creator)) {
      case (null) { 0 };
      case (?n) { n };
    };
  };

  public query func getLeaderboard() : async [(Principal, Nat)] {
    creatorHyvMined.entries().toArray();
  };
};
