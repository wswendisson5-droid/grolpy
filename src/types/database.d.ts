declare module "*database.cjs" {
  export const mysql: any;
  export function initDatabase(): Promise<boolean>;
  export function ensureCampaignsTable(): Promise<void>;
  export function getUserByToken(token: string): Promise<any>;
  export function registerUser(name: string, email: string, phone: string, password: string): Promise<any>;
  export function loginUser(email: string, password: string): Promise<any>;
  export function ensureAdminAccount(name: string, email: string, password: string): Promise<any>;
  export function authDiagnostic(): Promise<any>;
  export function createPendingTestSubscriber(data: any): Promise<any>;
  export function listAdminSubscriptions(): Promise<any>;
  export function adminSetSubscription(userId: number, action: string): Promise<any>;
  export function ensureUserInstance(userId: number): Promise<any>;
  export function getUserInstance(userId: number): Promise<any>;
  export function setUserInstanceStatus(userId: number, status: string, ownerPhone?: string, profileName?: string, profilePicUrl?: string): Promise<any>;
  export function getSubscriptionForUser(userId: number): Promise<any>;
  export function listCampaignsForUser(userId: number): Promise<any[]>;
  export function listActiveScheduledCampaigns(): Promise<any[]>;
  export function saveCampaignForUser(userId: number, campaign: any): Promise<any>;
  export function listGroupsForUser(userId: number): Promise<any[]>;
  export function saveGroupsForUser(userId: number, groups: any[]): Promise<any>;
  export function clearGroupsForUser(userId: number): Promise<any>;
  export function listHistoryForUser(userId: number, limit?: number): Promise<any[]>;
  export function addHistoryForUser(userId: number, entry: any): Promise<any>;
  const content: any;
  export default content;
}
