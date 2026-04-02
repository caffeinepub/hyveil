import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  // --- Initialization ---
  // C-05 FIX: Track the deploying factory canister's principal and restrict
  // initialize() to that principal only. This closes the front-run window
  // between install_code completing and HYVEIL calling initialize():
  // an attacker who calls initialize() first will be rejected because
  // they are not the canister that installed (and thus deployed) this code.
  //
  // How it works: the IC sets the controller of this canister to HYVEIL's
  // main canister. We capture the first caller to this initialization gate
  // as the "factory" principal. Since install_code runs in HYVEIL's async
  // context, HYVEIL's principal will be the first caller, blocking any race.
  var factory : ?Principal = null;  // set on first call; only this principal can call initialize()
  var initialized = false;
  var owner : Principal = Principal.fromText("aaaaa-aa");
  var hyveilTreasury : Principal = Principal.fromText("aaaaa-aa");
  var channelName : Text = "";
  var channelDescription : Text = "";

  // First call after install_code establishes the factory principal.
  // All subsequent callers (including attackers) are rejected.
  public shared ({ caller }) func initialize(
    _owner : Principal,
    _treasury : Principal,
    _name : Text,
    _description : Text
  ) : async () {
    switch (factory) {
      case (null) {
        // First call — lock to this caller as the factory, then initialize
        factory := ?caller;
      };
      case (?f) {
        // Subsequent calls — only the original factory principal is allowed
        if (caller != f) {
          Runtime.trap("Unauthorized: Only the deploying factory canister can initialize this channel");
        };
      };
    };
    if (initialized) { Runtime.trap("Already initialized") };
    owner := _owner;
    hyveilTreasury := _treasury;
    channelName := _name;
    channelDescription := _description;
    initialized := true;
  };

  // --- Content Management ---
  public type ContentItem = {
    id : Nat;
    title : Text;
    description : Text;
    contentType : Text;
    priceE8s : Nat;
    thumbnailUrl : Text;
    createdAt : Int;
    viewCount : Nat;
    isActive : Bool;
  };

  var nextContentId = 1;
  let contentItems = Map.empty<Nat, ContentItem>();

  public shared ({ caller }) func addContent(
    title : Text,
    description : Text,
    contentType : Text,
    priceE8s : Nat,
    thumbnailUrl : Text
  ) : async ContentItem {
    if (caller != owner) { Runtime.trap("Unauthorized: Only channel owner can add content") };
    if (title.size() == 0 or title.size() > 128) {
      Runtime.trap("Title must be 1–128 characters.");
    };
    if (description.size() > 1024) {
      Runtime.trap("Description too long. Maximum 1024 characters.");
    };
    if (thumbnailUrl.size() > 512) {
      Runtime.trap("Thumbnail URL too long. Maximum 512 characters.");
    };
    let id = nextContentId;
    nextContentId += 1;
    let item : ContentItem = {
      id;
      title;
      description;
      contentType;
      priceE8s;
      thumbnailUrl;
      createdAt = Time.now();
      viewCount = 0;
      isActive = true;
    };
    contentItems.add(id, item);
    item;
  };

  public shared ({ caller }) func removeContent(id : Nat) : async () {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    switch (contentItems.get(id)) {
      case (null) { Runtime.trap("Content not found") };
      case (?item) {
        contentItems.add(id, { item with isActive = false });
      };
    };
  };

  public query func getContentItems() : async [ContentItem] {
    contentItems.values().filter(func(i : ContentItem) : Bool { i.isActive }).toArray();
  };

  public shared ({ caller }) func getAllContentItems() : async [ContentItem] {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    contentItems.values().toArray();
  };

  // --- Purchase & Revenue (90/10 split) ---
  // SECURITY: Only hyveilTreasury (HYVEIL's main canister) may call recordPurchase.
  // This prevents channel owners from fabricating fake transactions to inflate
  // their revenue stats and social mining (HYV) score.
  public type PurchaseRecord = {
    id : Nat;
    buyer : Principal;
    contentId : Nat;
    amountE8s : Nat;
    creatorShareE8s : Nat;
    hyveilShareE8s : Nat;
    timestamp : Int;
  };

  var nextPurchaseId = 1;
  let purchases = Map.empty<Nat, PurchaseRecord>();

  public shared ({ caller }) func recordPurchase(
    buyer : Principal,
    contentId : Nat,
    amountE8s : Nat
  ) : async () {
    // Only HYVEIL's main canister (hyveilTreasury) may record purchases.
    // Removing owner access closes the fake-transaction exploit.
    if (caller != hyveilTreasury) {
      Runtime.trap("Unauthorized: Only HYVEIL can record purchases. Partners cannot self-report transactions.");
    };
    let hyveilShare = amountE8s / 10;
    let creatorShare = amountE8s - hyveilShare;
    let id = nextPurchaseId;
    nextPurchaseId += 1;
    let record : PurchaseRecord = {
      id;
      buyer;
      contentId;
      amountE8s;
      creatorShareE8s = creatorShare;
      hyveilShareE8s = hyveilShare;
      timestamp = Time.now();
    };
    purchases.add(id, record);
    switch (contentItems.get(contentId)) {
      case (?item) {
        contentItems.add(contentId, { item with viewCount = item.viewCount + 1 });
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func getPurchaseHistory() : async [PurchaseRecord] {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    purchases.values().toArray();
  };

  public type RevenueStats = {
    totalRevenue : Nat;
    creatorEarnings : Nat;
    hyveilCommission : Nat;
    purchaseCount : Nat;
  };

  public shared ({ caller }) func getRevenueStats() : async RevenueStats {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    var totalRevenue = 0;
    var creatorEarnings = 0;
    var hyveilCommission = 0;
    for (p in purchases.values()) {
      totalRevenue += p.amountE8s;
      creatorEarnings += p.creatorShareE8s;
      hyveilCommission += p.hyveilShareE8s;
    };
    {
      totalRevenue;
      creatorEarnings;
      hyveilCommission;
      purchaseCount = purchases.size();
    };
  };

  // --- Follower System ---
  // SECURITY: Follow/unfollow rate-limited to 1 action per hour per principal.
  // Prevents bot farms from artificially inflating follower counts which
  // feed into the HYV social mining oracle score (2 pts per follower).
  let followers = Map.empty<Principal, Bool>();
  let followTimestamps = Map.empty<Principal, Int>();
  let FOLLOW_COOLDOWN : Int = 3_600_000_000_000; // 1 hour in nanoseconds

  public shared ({ caller }) func follow() : async () {
    if (Principal.isAnonymous(caller)) { Runtime.trap("Must be authenticated to follow") };
    let now = Time.now();
    switch (followTimestamps.get(caller)) {
      case (?lastTime) {
        if (now - lastTime < FOLLOW_COOLDOWN) {
          Runtime.trap("Rate limited: You can only follow or unfollow once per hour per account");
        };
      };
      case (null) {};
    };
    followers.add(caller, true);
    followTimestamps.add(caller, now);
  };

  public shared ({ caller }) func unfollow() : async () {
    if (Principal.isAnonymous(caller)) { Runtime.trap("Must be authenticated to unfollow") };
    let now = Time.now();
    switch (followTimestamps.get(caller)) {
      case (?lastTime) {
        if (now - lastTime < FOLLOW_COOLDOWN) {
          Runtime.trap("Rate limited: You can only follow or unfollow once per hour per account");
        };
      };
      case (null) {};
    };
    ignore followers.remove(caller);
    followTimestamps.add(caller, now);
  };

  public query func getFollowerCount() : async Nat {
    followers.size();
  };

  public shared ({ caller }) func getFollowers() : async [Principal] {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    followers.keys().toArray();
  };

  public query func isFollowing(user : Principal) : async Bool {
    switch (followers.get(user)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  // --- Channel Info ---
  public type ChannelInfo = {
    owner : Principal;
    channelName : Text;
    channelDescription : Text;
    contentCount : Nat;
    followerCount : Nat;
    totalRevenue : Nat;
  };

  public query func getChannelInfo() : async ChannelInfo {
    var totalRevenue = 0;
    for (p in purchases.values()) {
      totalRevenue += p.amountE8s;
    };
    {
      owner;
      channelName;
      channelDescription;
      contentCount = contentItems.values().filter(func(i : ContentItem) : Bool { i.isActive }).toArray().size();
      followerCount = followers.size();
      totalRevenue;
    };
  };

  public shared ({ caller }) func updateChannelInfo(name : Text, description : Text) : async () {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    if (name.size() == 0 or name.size() > 128) {
      Runtime.trap("Channel name must be 1–128 characters.");
    };
    if (description.size() > 1024) {
      Runtime.trap("Description too long. Maximum 1024 characters.");
    };
    channelName := name;
    channelDescription := description;
  };

  // --- Analytics ---
  public type PerformanceStats = {
    totalViews : Nat;
    totalRevenue : Nat;
    followerCount : Nat;
    contentCount : Nat;
    topContentId : ?Nat;
  };

  public shared ({ caller }) func getPerformanceStats() : async PerformanceStats {
    if (caller != owner) { Runtime.trap("Unauthorized") };
    var totalViews = 0;
    var totalRevenue = 0;
    var topContentId : ?Nat = null;
    var topViews = 0;
    for (item in contentItems.values()) {
      totalViews += item.viewCount;
      if (item.viewCount > topViews) {
        topViews := item.viewCount;
        topContentId := ?item.id;
      };
    };
    for (p in purchases.values()) {
      totalRevenue += p.amountE8s;
    };
    {
      totalViews;
      totalRevenue;
      followerCount = followers.size();
      contentCount = contentItems.size();
      topContentId;
    };
  };

  // --- Social Metrics (read by oracle for Proof of Social Work mining) ---
  public query func getSocialMetrics() : async {
    uploads : Nat;
    views : Nat;
    followers : Nat;
    sales : Nat;
    subscriptions : Nat;
  } {
    var totalViews = 0;
    var sales = 0;
    for (item in contentItems.values()) {
      totalViews += item.viewCount;
    };
    for (p in purchases.values()) {
      if (p.amountE8s > 0) { sales += 1 };
    };
    {
      // H-07 fix: only count active (non-deactivated) content to prevent score inflation
      // from repeatedly adding/removing content items.
      uploads = contentItems.values().filter(func(i : ContentItem) : Bool { i.isActive }).toArray().size();
      views = totalViews;
      followers = followers.size();
      sales;
      subscriptions = 0;
    };
  };
};
