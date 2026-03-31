import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

module {
  // Type helpers for migration
  type OldPartnerStatus = {
    #pending;
    #approved;
    #revoked;
  };

  type OldPartnerRecord = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    website : Text;
    canisterId : Principal;
    status : OldPartnerStatus;
    registeredAt : Int;
    chains : [Text];
  };

  type OldActor = {
    accessControlState : AccessControl.AccessControlState;
    userProfiles : Map.Map<Principal, { name : Text }>;
    nextPartnerId : Nat;
    partners : Map.Map<Nat, OldPartnerRecord>;
    icpBalances : Map.Map<Principal, Nat>;
    videos : Map.Map<Text, { id : Text; title : Text; caption : Text; blobId : Text; uploadedAt : Nat; likes : Nat; comments : [{ author : Principal; text : Text; createdAt : Int }] }>;
  };

  module NewTypes {
    type NewPartnerStatus = {
      #pending;
      #approved;
      #revoked;
    };

    public type NewPartnerRecord = {
      id : Nat;
      owner : Principal;
      name : Text;
      description : Text;
      website : Text;
      canisterId : Principal;
      status : NewPartnerStatus;
      registeredAt : Int;
      chains : [Text];
      monetizationModel : Text;
      totalRevenue : Nat;
    };

    public type NewActor = {
      accessControlState : AccessControl.AccessControlState;
      userProfiles : Map.Map<Principal, { name : Text }>;
      nextPartnerId : Nat;
      partners : Map.Map<Nat, NewPartnerRecord>;
      icpBalances : Map.Map<Principal, Nat>;
      videos : Map.Map<Text, { id : Text; title : Text; caption : Text; blobId : Text; uploadedAt : Nat; likes : Nat; comments : [{ author : Principal; text : Text; createdAt : Int }] }>;
    };
  };

  public func run(old : OldActor) : NewTypes.NewActor {
    let newPartners = old.partners.map<Nat, OldPartnerRecord, NewTypes.NewPartnerRecord>(
      func(_id, oldPartner) {
        {
          id = oldPartner.id;
          owner = oldPartner.owner;
          name = oldPartner.name;
          description = oldPartner.description;
          website = oldPartner.website;
          canisterId = oldPartner.canisterId;
          status = oldPartner.status;
          registeredAt = oldPartner.registeredAt;
          chains = oldPartner.chains;
          monetizationModel = "payPerView";
          totalRevenue = 0;
        };
      }
    );

    {
      accessControlState = old.accessControlState;
      userProfiles = old.userProfiles;
      nextPartnerId = old.nextPartnerId;
      partners = newPartners;
      icpBalances = old.icpBalances;
      videos = old.videos;
    };
  };
};
