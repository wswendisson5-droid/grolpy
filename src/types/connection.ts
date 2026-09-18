export type ConnectionStatus =
  | 'loading'
  | 'waiting_qr'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

export interface QrCodeData {
  code?: string;
  base64?: string;
  pairingCode?: string;
  updatedAt?: number;
}

export interface ConnectedProfile {
  name: string;
  number: string;
  pictureUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  version?: string;
}

export interface ConnectionInfo {
  instanceName: string;
  platform: string;
  status: ConnectionStatus;
  webhookStatus: 'active' | 'waiting' | 'inactive';
  webhookUrl?: string;
  lastUpdate?: string;
  qrCode?: QrCodeData;
  profile?: ConnectedProfile;
  messagesToday?: number;
  lastActivity?: string;
  apiStatus?: 'online' | 'offline';
  configured?: boolean;
  instanceExists?: boolean;
  error?: string;
}
