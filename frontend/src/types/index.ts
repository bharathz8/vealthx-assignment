export interface User {
    _id: string;
    name: string;
    email: string;
  }
  
  export interface Asset {
    _id: string;
    name: string;
    type: 'bank_account' | 'insurance' | 'vehicle';
    accountNumber?: string;
    policyNumber?: string;
    balanceAmount?: number;
    insuredAmount?: number;
    renewalDate?: string;
    source: 'static' | 'detected';
    createdAt: string;
    updatedAt: string;
  }
  
  export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
  }
  
  export interface ProcessedFileResult {
    documentType: 'bank_statement' | 'insurance_policy' | 'vehicle_policy' | 'unknown';
    extractedData: Partial<Asset>;
  }
  
  export interface ScanResult {
    extractedAssets: Partial<Asset>[];
    missingAssets: {
      missing_bank_accounts: Partial<Asset>[];
      missing_insurances: Partial<Asset>[];
    };
    savedAssets: Asset[];
  }
  
  export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
  }