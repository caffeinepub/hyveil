import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Comment {
    createdAt: bigint;
    text: string;
    author: Principal;
}
export interface ChannelRevenue {
    partnerName: string;
    creatorShare: bigint;
    hyveilShare: bigint;
    partnerId: bigint;
    purchaseCount: bigint;
    totalRevenue: bigint;
    canisterId: Principal;
}
export interface PlatformRevenue {
    partnerCount: bigint;
    totalCreatorShare: bigint;
    totalHyveilShare: bigint;
    totalPurchases: bigint;
    totalRevenue: bigint;
}
export interface VideoMeta {
    id: string;
    title: string;
    likes: bigint;
    caption: string;
    blobId: string;
    comments: Array<Comment>;
    uploadedAt: bigint;
}
export interface ProxyResponse {
    body: string;
    statusCode: bigint;
    success: boolean;
}
export interface RevenueStats {
    creatorShare: bigint;
    hyveilShare: bigint;
    purchaseCount: bigint;
    totalRevenue: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface PartnerRecord {
    id: bigint;
    status: PartnerStatus;
    owner: Principal;
    name: string;
    description: string;
    website: string;
    monetizationModel: string;
    chains: Array<string>;
    totalRevenue: bigint;
    registeredAt: bigint;
    canisterId: Principal;
}
export interface ContentItem {
    id: string;
    title: string;
    contentType: string;
    createdAt: bigint;
    description: string;
    partnerId: bigint;
    priceE8s: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface RegisterPartnerInput {
    name: string;
    description: string;
    website: string;
    chains: Array<string>;
}
export interface PurchaseRecord {
    id: bigint;
    contentId: string;
    hyveilShareE8s: bigint;
    partnerId: bigint;
    totalAmountE8s: bigint;
    creatorShareE8s: bigint;
    timestamp: bigint;
    buyer: Principal;
}
export interface UserProfile {
    name: string;
}
export enum PartnerStatus {
    revoked = "revoked",
    pending = "pending",
    approved = "approved"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface CmcTopUpResult {
    cyclesAdded: bigint;
}
export interface IcpXdrRate {
    xdrPermyriadPerIcp: bigint;
    timestampSeconds: bigint;
}
export interface backendInterface {
    addComment(id: string, text: string): Promise<void>;
    addContentItem(partnerId: bigint, title: string, description: string, priceE8s: bigint, contentType: string): Promise<ContentItem>;
    approvePartner(id: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimOwnerIfFirst(): Promise<boolean>;
    clearChannelWasm(): Promise<void>;
    depositIcp(amount: bigint): Promise<void>;
    getAllPartnersRevenue(): Promise<PlatformRevenue>;
    getApprovedPartners(): Promise<Array<PartnerRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChannelWasmStatus(): Promise<{
        size: bigint;
        loaded: boolean;
    }>;
    getContentItems(partnerId: bigint): Promise<Array<ContentItem>>;
    getHyvBalance(principal: Principal): Promise<bigint>;
    getHyveilCyclesBalance(): Promise<bigint>;
    getHyveilPrincipal(): Promise<Principal | null>;
    getMyChannelsRevenue(): Promise<Array<ChannelRevenue>>;
    getMyIcpBalance(): Promise<bigint>;
    getMyPartners(): Promise<Array<PartnerRecord>>;
    getOraclePrincipal(): Promise<Principal | null>;
    getPartnerRevenue(partnerId: bigint): Promise<RevenueStats>;
    getPartners(): Promise<Array<PartnerRecord>>;
    getRegistrationFee(): Promise<bigint>;
    getTokenCanisterId(): Promise<Principal | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideos(): Promise<Array<VideoMeta>>;
    isCallerAdmin(): Promise<boolean>;
    likeVideo(id: string): Promise<void>;
    proxyFetch(url: string, method: string, body: string | null, extraHeaders: Array<[string, string]> | null): Promise<ProxyResponse>;
    purchaseContent(contentId: string): Promise<PurchaseRecord>;
    registerChannelForMining(channelId: Principal, ownerPrincipal: Principal): Promise<void>;
    registerPartner(input: RegisterPartnerInput): Promise<PartnerRecord>;
    revokePartner(id: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveVideoMeta(meta: VideoMeta): Promise<void>;
    setChannelWasm(wasm: Uint8Array): Promise<void>;
    setHyveilPrincipal(p: Principal): Promise<void>;
    setMonetizationModel(partnerId: bigint, model: string): Promise<void>;
    setOraclePrincipal(p: Principal): Promise<void>;
    setTokenCanisterId(p: Principal): Promise<void>;
    hasPurchased(contentId: string): Promise<boolean>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    withdrawEarnings(amount: bigint): Promise<void>;
    icrc1_fee(): Promise<bigint>;
    notifyTopUp(blockIndex: bigint): Promise<bigint>;
    getIcpXdrConversionRate(): Promise<IcpXdrRate>;
    getCachedIcpXdrRate(): Promise<IcpXdrRate>;
    getAutoRefillStatus(): Promise<{ lastRefillTime: bigint; totalRefillCount: bigint; oracleCycles: bigint; tokenCycles: bigint; refillThreshold: bigint; refillTarget: bigint }>;
    triggerAutoRefill(): Promise<void>;
    getPartnerCanisterCycles(partnerId: bigint): Promise<bigint>;
    topUpPartnerCanister(partnerId: bigint): Promise<void>;
    deployTokenSystem(): Promise<{ tokenCanisterId: Principal; oracleCanisterId: Principal }>;
    getTokenSystemStatus(): Promise<{ tokenDeployed: boolean; oracleDeployed: boolean; tokenCanisterId: Principal | null; oracleCanisterId: Principal | null; tokenWasmLoaded: boolean; oracleWasmLoaded: boolean }>;
}
