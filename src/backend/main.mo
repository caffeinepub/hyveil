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

  // --- Token System Management (Admin-only) ---
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

  // --- Token System Status ---
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

  // --- One-Click Token System Deployment (Admin-only) ---
  // Deploys token.mo and oracle.mo as real ICP canisters from HYVEIL's cycles reserve,
  // wires them together, and stores their canister IDs. Can only be run once.
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

    let tWasm = switch (tokenWasm) {
      case (null) { Runtime.trap("Token WASM not loaded") };
      case (?w) { w };
    };
    let oWasm = switch (oracleWasm) {
      case (null) { Runtime.trap("Oracle WASM not loaded") };
      case (?w) { w };
    };

    // Deploy token canister
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

    // Deploy oracle canister
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

    // Wire: set admin on token canister, then set oracle as the minter
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

    // Store canister IDs
    tokenCanisterId := ?newTokenId;
    oraclePrincipal := ?newOracleId;

    { tokenCanisterId = newTokenId; oracleCanisterId = newOracleId };
  };

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

  // Channel actor interface for post-deploy initialization
  type ChannelActor = actor {
    initialize : (Principal, Principal, Text, Text) -> async ();
  };

  // Oracle actor interface
  type OracleActor = actor {
    registerChannel : (Principal, Principal) -> async ();
  };

  // Token actor interface
  type TokenActor = actor {
    balanceOf : (Principal) -> async Nat;
  };

  // User Profile Type and Management
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

  // Partner Registry
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

  var nextPartnerId = 1;
  let partners = Map.empty<Nat, PartnerRecord>();
  let icpBalances = Map.empty<Principal, Nat>();

  public shared ({ caller }) func depositIcp(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can deposit ICP");
    };
    let currentBalance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    icpBalances.add(caller, currentBalance + amount);
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
      case (null) {
        Runtime.trap("Channel WASM not loaded. Admin must call setChannelWasm first.");
      };
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

    let newBalance = currentBalance - registrationFee : Nat;
    icpBalances.add(caller, newBalance);

    let treasury = switch (hyveilPrincipal) {
      case (?p) { p };
      case (null) { Principal.fromActor(Main) };
    };

    let { canister_id = newCanisterId } = await (
      with cycles = 50_000_000_000
    ) icManagement.create_canister({
      settings = ?{
        controllers = ?[Principal.fromActor(Main), caller];
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      };
    });

    await icManagement.install_code({
      mode = #install;
      canister_id = newCanisterId;
      wasm_module = wasm;
      arg = Blob.fromArray([]);
    });

    let channelActor : ChannelActor = actor (newCanisterId.toText());
    await channelActor.initialize(caller, treasury, input.name, input.description);

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

  public query ({ caller }) func getHyvBalance(principal : Principal) : async Nat {
    switch (tokenCanisterId) {
      case (null) { 0 };
      case (?_tokenId) { 0 };
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

  public shared ({ caller }) func purchaseContent(contentId : Text) : async PurchaseRecord {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can purchase content");
    };
    let content = switch (contentItems.get(contentId)) {
      case (null) { Runtime.trap("Content not found") };
      case (?c) { c };
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
    purchase;
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

  public shared ({ caller }) func proxyFetch(url : Text, method : Text, body : ?Text, extraHeaders : ?[(Text, Text)]) : async ProxyResponse {
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
};
