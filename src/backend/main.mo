import OutCall "http-outcalls/outcall";
import Debug "mo:core/Debug";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Error "mo:core/Error";

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
    Debug.print("proxyFetch called with url: " # url # " method: " # method);
    
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
