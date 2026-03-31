import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
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
export interface ProxyResponse {
    body: string;
    statusCode: bigint;
    success: boolean;
}
export interface PartnerRecord {
    id: bigint;
    status: PartnerStatus;
    owner: Principal;
    name: string;
    description: string;
    website: string;
    chains: Array<string>;
    registeredAt: bigint;
    canisterId: Principal;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
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
export interface backendInterface {
    approvePartner(id: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    depositIcp(amount: bigint): Promise<void>;
    getApprovedPartners(): Promise<Array<PartnerRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyIcpBalance(): Promise<bigint>;
    getMyPartners(): Promise<Array<PartnerRecord>>;
    getPartners(): Promise<Array<PartnerRecord>>;
    getRegistrationFee(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    proxyFetch(url: string, method: string, body: string | null, extraHeaders: Array<[string, string]> | null): Promise<ProxyResponse>;
    registerPartner(input: RegisterPartnerInput): Promise<PartnerRecord>;
    revokePartner(id: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
