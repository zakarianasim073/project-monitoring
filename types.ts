export type UserRole = 'DIRECTOR' | 'MANAGER' | 'ENGINEER' | 'ACCOUNTANT';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type UnitType = 'CUM' | 'SQM' | 'NOS' | 'KG' | 'RMT' | 'CFT' | 'LTR' | 'TON';
export type DocumentCategory = 'DRAWING' | 'SPECIFICATION' | 'REPORT' | 'CONTRACT' | 'BOQ' | 'BILL' | 'OTHER';
export type ModuleType = 'MASTER' | 'SITE' | 'FINANCE' | 'LIABILITY';
export type ProjectStatus = 'ACTIVE' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

// Runtime constant that matches Unit type for use in Object.values()
export const Unit = {
  CUM: 'CUM',
  SQM: 'SQM',
  NOS: 'NOS',
  KG: 'KG',
  RMT: 'RMT',
  CFT: 'CFT',
  LTR: 'LTR',
  TON: 'TON',
} as const;

export interface CostBreakdown {
  material: number;
  labour: number;
  labor?: number; // Alias for labour (US spelling)
  equipment: number;
  overhead: number;
}

export interface CostAnalysis {
  planned: CostBreakdown;
  actual: CostBreakdown;
  variance: number;
}

export interface BOQItem {
  id: string;
  description: string;
  unit: UnitType;
  rate: number;
  plannedQty: number;
  executedQty: number;
  plannedUnitCost: number;
  plannedBreakdown: CostBreakdown;
  actualUnitCost: number;
  actualBreakdown: CostBreakdown;
  priority: Priority;
  costAnalysis?: CostAnalysis;
  billedAmount?: number;
  linkedDocId?: string;
}

export interface MaterialConsumption {
  itemId: string;
  materialId?: string;
  description: string;
  quantity: number;
  qty?: number; // Alias for quantity
  unit: UnitType;
}

export interface SubContractor {
  id: string;
  name: string;
  contact: string;
  work: string;
  amount: number;
}

export interface Material {
  id: string;
  name: string;
  unit: UnitType;
  rate: number;
}

export interface DPR {
  id: string;
  date: string;
  activity?: string;
  location?: string;
  linkedBoqId?: string;
  workDoneQty?: number;
  items: {
    itemId: string;
    quantity: number;
  }[];
  materials: MaterialConsumption[];
  materialsUsed?: MaterialConsumption[];
  laborCount?: number;
  manpower: {
    skilled: number;
    unskilled: number;
  };
  equipment: {
    name: string;
    hours: number;
  }[];
  remarks: string;
  weather: string;
  entryBy: string;
  approvedBy?: string;
  subContractorId?: string;
}

export interface ExtractedBill {
  type?: string;
  entityName?: string;
  amount?: number;
  date?: string;
  items: {
    itemId: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  totalAmount: number;
}

export interface Bill {
  id: string;
  billNo: string;
  date: string;
  period: {
    from: string;
    to: string;
  };
  items: {
    itemId: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  totalAmount: number;
  amount?: number; // Alias for totalAmount
  type?: string;
  entityName?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'PENDING';
  submittedBy?: string;
  approvedBy?: string;
  remarks?: string;
  pdRemarks?: string;
}

export interface Liability {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  category: 'VENDOR' | 'LABOUR' | 'EQUIPMENT' | 'OTHER';
  type?: string; // Alias for category
  payee: string;
  remarks?: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  url?: string;
  module?: ModuleType | 'GENERAL';
  type?: string;
  extractedData?: ExtractedBill;
  isAnalyzed?: boolean;
}

export interface AiSuggestion {
  id: string;
  type: 'cost_alert' | 'schedule_warning' | 'quality_issue' | 'optimization';
  message: string;
  priority: Priority;
  actionable: boolean;
  dismissed?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  progress: number;
}

export interface ProjectState {
  id: string;
  name: string;
  contractValue: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  priority: Priority;
  boq: BOQItem[];
  dprs: DPR[];
  bills: Bill[];
  liabilities: Liability[];
  documents: ProjectDocument[];
  suggestions?: AiSuggestion[];
  aiSuggestions?: AiSuggestion[]; // Alias for suggestions
  milestones?: Milestone[];
  materials?: Material[];
  subContractors?: SubContractor[];
}

export interface ExtractedDPR {
  date: string;
  activity: string;
  items: {
    itemId: string;
    description: string;
    quantity: number;
  }[];
  materials: MaterialConsumption[];
  manpower: {
    skilled: number;
    unskilled: number;
  };
  equipment: {
    name: string;
    hours: number;
  }[];
  remarks: string;
  weather: string;
}
