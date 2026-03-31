import OutCall "http-outcalls/outcall";
import Debug "mo:core/Debug";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Error "mo:core/Error";

import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Int "mo:core/Int";

// Apply migration using the with-clause

actor {
  // Initialize the authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type and storage
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User profile management functions
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
    // In a real implementation, verify ledger transfer with notify
    let currentBalance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    icpBalances.add(caller, currentBalance + amount);
  };

  public query ({ caller }) func getRegistrationFee() : async Nat {
    50_000_000;
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

    let registrationFee = 50_000_000;
    let currentBalance = switch (icpBalances.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    if (currentBalance < registrationFee) {
      Runtime.trap("Insufficient ICP balance for registration. You have " # currentBalance.toText() # " e8s, need " # registrationFee.toText() # " e8s. Deposit ICP first.");
    };

    // Debit the registration fee
    icpBalances.add(caller, currentBalance - registrationFee);

    let partnerId = nextPartnerId;
    nextPartnerId += 1;

    let newPartner : PartnerRecord = {
      id = partnerId;
      owner = caller;
      name = input.name;
      description = input.description;
      website = input.website;
      canisterId = caller;
      status = #approved;
      registeredAt = Time.now();
      chains = input.chains;
    };
    partners.add(partnerId, newPartner);
    newPartner;
  };

  public query ({ caller }) func getPartners() : async [PartnerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view the partner registry");
    };
    partners.values().toArray();
  };

  public query ({ caller }) func getApprovedPartners() : async [PartnerRecord] {
    partners.values().filter(
      func(p) {
        p.status == #approved;
      }
    ).toArray();
  };

  public query ({ caller }) func getMyPartners() : async [PartnerRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their partners");
    };
    partners.values().filter(
      func(p) {
        p.owner == caller;
      }
    ).toArray();
  };

  public shared ({ caller }) func approvePartner(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can approve partners");
    };

    let partner = switch (partners.get(id)) {
      case (null) { Runtime.trap("Partner not found"); };
      case (?p) { p };
    };
    let updatedPartner = { partner with status = #approved };
    partners.add(id, updatedPartner);
  };

  public shared ({ caller }) func revokePartner(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can revoke partners");
    };

    let partner = switch (partners.get(id)) {
      case (null) { Runtime.trap("Partner not found"); };
      case (?p) { p };
    };
    let updatedPartner = { partner with status = #revoked };
    partners.add(id, updatedPartner);
  };

  // First-login owner claim: the very first authenticated user becomes admin
  public shared ({ caller }) func claimOwnerIfFirst() : async Bool {
    if (caller.isAnonymous()) { return false };
    if (accessControlState.adminAssigned) { return false };
    accessControlState.adminAssigned := true;
    accessControlState.userRoles.add(caller, #admin);
    true;
  };

  // Proxy fetch functionality
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
      func(tuple) {
        {
          name = tuple.0;
          value = tuple.1;
        };
      }
    );
  };

  // proxyFetch is callable by any user (including guests), so no authorization check needed
  public shared ({ caller }) func proxyFetch(url : Text, method : Text, body : ?Text, extraHeaders : ?[(Text, Text)]) : async ProxyResponse {
    try {
      let headers : [OutCall.Header] = switch (extraHeaders) {
        case (null) { [] };
        case (?h) { convertHeaders(h) };
      };

      if (method == "GET") {
        let response = await OutCall.httpGetRequest(url, headers, transform);
        {
          statusCode = 200;
          body = response;
          success = true;
        };
      } else if (method == "POST") {
        switch (body) {
          case (?b) {
            let response = await OutCall.httpPostRequest(url, headers, b, transform);
            {
              statusCode = 200;
              body = response;
              success = true;
            };
          };
          case (null) {
            {
              statusCode = 400;
              body = "POST body is required, but none was provided.";
              success = false;
            };
          };
        };
      } else {
        {
          statusCode = 400;
          body = "Only GET and POST methods supported. You sent: " # method;
          success = false;
        };
      };
    } catch (e) {
      {
        statusCode = 500;
        body = "Error during HTTP outcall: " # e.message();
        success = false;
      };
    };
  };
};
