import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  // --- Initialization ---
  var initialized = false;
  var owner : Principal = Principal.fromText("aaaaa-aa");
  var hyveilTreasury : Principal = Principal.fromText("aaaaa-aa");
  var channelName : Text = "";
  var channelDescription : Text = "";

  public shared ({ caller }) func initialize(
    _owner : Principal,
    _treasury : Principal,
    _name : Text,
    _description : Text
  ) : async () {
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
    if (caller != owner and caller != hyveilTreasury) {
      Runtime.trap("Unauthorized: Only owner or HYVEIL treasury can record purchases");
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
  let followers = Map.empty<Principal, Bool>();

  public shared ({ caller }) func follow() : async () {
    if (Principal.isAnonymous(caller)) { Runtime.trap("Must be authenticated to follow") };
    followers.add(caller, true);
  };

  public shared ({ caller }) func unfollow() : async () {
    ignore followers.remove(caller);
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
};
