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
  let INITIAL_DAILY_MINT : Nat = 273_900_000_000; // 2739 HYV in e8s
  let HALVING_INTERVAL : Nat = 1460; // oracle cycles between halvings
  let HARD_CAP : Nat = 2_100_000_000_000_000; // 21M HYV in e8s

  var admin : ?Principal = null;
  var tokenCanisterId : ?Principal = null;
  var totalOracleCycles : Nat = 0;
  var totalMintedByOracle : Nat = 0;

  // Registry: channel canister ID -> owner principal
  let channelRegistry = Map.empty<Principal, Principal>();

  // Per-creator HYV mined (for leaderboard)
  let creatorHyvMined = Map.empty<Principal, Nat>();

  // Channel actor interface
  type ChannelActor = actor {
    getSocialMetrics : () -> async {
      uploads : Nat;
      views : Nat;
      followers : Nat;
      sales : Nat;
      subscriptions : Nat;
    };
  };

  // Token actor interface
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
  public shared ({ caller }) func registerChannel(channelId : Principal, ownerPrincipal : Principal) : async () {
    // HYVEIL main canister or admin can register channels
    switch (admin) {
      case (null) {}; // allow before admin is set (for init)
      case (?a) {
        if (caller != a) { Runtime.trap("Unauthorized: Only admin can register channels") };
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

  // --- Oracle Cycle (run daily via timer or manual trigger) ---
  public shared ({ caller }) func runOracleCycle() : async Text {
    // Admin or self (timer) can trigger
    switch (admin) {
      case (?a) {
        if (caller != a and caller != Principal.fromActor(Oracle)) {
          Runtime.trap("Unauthorized: Admin or timer only");
        };
      };
      case (null) {};
    };

    let tokenId = switch (tokenCanisterId) {
      case (null) { return "Token canister not set" };
      case (?t) { t };
    };

    let dailyMint = getCurrentDailyMint();
    if (dailyMint == 0) { return "Daily mint is 0 (all HYV mined)" };
    if (totalMintedByOracle >= HARD_CAP) { return "Hard cap reached" };

    // Gather metrics from all registered channels
    let channels = channelRegistry.entries().toArray();
    if (channels.size() == 0) {
      totalOracleCycles += 1;
      return "No channels registered";
    };

    // Collect scores
    let tokenActor : TokenActor = actor (tokenId.toText());
    var totalScore : Nat = 0;
    let scores = Map.empty<Principal, Nat>(); // owner -> score

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
      } catch (e) {
        // Skip unreachable channels
      };
    };

    if (totalScore == 0) {
      totalOracleCycles += 1;
      return "No social activity recorded";
    };

    // Distribute proportional HYV
    let actualMint = Nat.min(dailyMint, HARD_CAP - totalMintedByOracle);
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
        } catch (e) {
          // Continue on mint failure
        };
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
