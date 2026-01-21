
export enum Unit {
  SQM = 'SQM',
  CUM = 'CUM',
  KG = 'KG',
  NOS = 'NOS',
  RMT = 'RMT',
  CFT = 'CFT',
  BAG = 'BAG',
  TON = 'TON'
}

export type UserRole = 'DIRECTOR' | 'MANAGER' | 'ACCOUNTANT' | 'ENGINEER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface CostBreakdown {
  material: number;
  labor: number;
  equipment: number;
  overhead: number;
}

export interface CostAnalysis {
  unitCost: number; // Actual cost per unit
  breakdown: CostBreakdown;
}

export interface BOQItem {
  id: string;
  description: string;
  unit: Unit;
  rate: number; // Contract Selling Rate
  plannedQty: number;
  plannedUnitCost: number; // Internal Budgeted Cost
  plannedBreakdown?: CostBreakdown; // Detailed planned breakdown
  executedQty: number; // From Site Execution
  billedAmount?: number; // Cumulative amount certified/received from PE
  costAnalysis?: CostAnalysis;
  priority?: Priority;
  linkedDocId?: string; // Reference to a specific ProjectDocument
}

export interface MaterialConsumption {
  materialId: string;
  qty: number;
}

export interface SubContractor {
  id: string;
  name: string;
  specialization: string;
  contactNumber?: string;
  agreedRates: { boqId: string; rate: number }[]; // Rate per unit for specific BOQ items
  totalWorkValue: number; // Value of work done based on DPRs
  totalBilled: number; // Amount billed/paid via Bills
  currentLiability: number; // totalWorkValue - totalBilled
  pdRemarks?: string;
}

export interface DPR {
  id: string;
  date: string;
  activity: string;
  location: string;
  laborCount: number;
  remarks: string;
  linkedBoqId?: string; // Optional link to BOQ
  subContractorId?: string; // Link to Sub-Contractor if they did the work
  workDoneQty?: number; // Quantity achieved today
  materialsUsed?: MaterialConsumption[]; // Materials consumed in this activity
  pdRemarks?: string; // Project Director Note
}

export interface Material {
  id: string;
  name: string;
  unit: Unit;
  totalReceived: number; // Cumulative Sent to Site
  totalConsumed: number; // Cumulative Used
  currentStock: number; // Calculated Stock
  averageRate: number; // Buying Price per unit
  pdRemarks?: string; // Project Director Note
}

export interface Bill {
  id: string;
  type: 'CLIENT_RA' | 'VENDOR_INVOICE' | 'SUB_CONTRACTOR' | 'MATERIAL_EXPENSE';
  entityName: string; // Client or Vendor Name
  amount: number;
  date: string;
  status: 'PAID' | 'PENDING';
  pdRemarks?: string;
}

export interface Liability {
  id: string;
  description: string;
  type: 'RETENTION' | 'PENDING_PO' | 'UNBILLED_WORK';
  amount: number;
  dueDate: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'AT_RISK';
  description?: string;
}

export type DocumentCategory = 'CONTRACT' | 'DRAWING' | 'PERMIT' | 'REPORT' | 'BILL' | 'OTHER';
export type ModuleType = 'MASTER' | 'SITE' | 'FINANCE' | 'LIABILITY' | 'GENERAL';

export interface ProjectDocument {
  id: string;
  name: string;
  type: string; // e.g., 'PDF', 'JPG', 'XLSX'
  category: DocumentCategory;
  module: ModuleType;
  uploadDate: string;
  size: string;
  url?: string;
  isAnalyzed?: boolean;
}

export interface AiSuggestion {
  id: string;
  docId: string;
  type: 'QUANTITY_UPDATE' | 'BILL_DETECTION' | 'RISK_ALERT' | 'BOQ_IMPORT' | 'DPR_ENTRY';
  title: string;
  description: string;
  value?: any; // Quantity number or Bill object or BOQItem[] or ExtractedDPR
  linkedId?: string; // BOQ Item ID or similar
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
}

export interface ProjectState {
  id: string;
  name: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  priority: Priority;
  contractValue: number;
  startDate: string;
  endDate: string;
  boq: BOQItem[];
  materials: Material[]; // New Material Inventory
  subContractors: SubContractor[]; // New Sub-Contractor Management
  dprs: DPR[];
  bills: Bill[];
  liabilities: Liability[];
  milestones: Milestone[];
  documents: ProjectDocument[];
  aiSuggestions: AiSuggestion[];
}

export interface ExtractedMaterial {
  name: string;
  qty: number;
}

export interface ExtractedDPR {
  date?: string;
  activity?: string;
  location?: string;
  laborCount?: number;
  remarks?: string;
  workDoneQty?: number;
  linkedBoqId?: string;
  subContractorName?: string; 
  materials?: ExtractedMaterial[]; // Structured extracted materials
}

export interface ExtractedBill {
  entityName?: string;
  amount?: number;
  date?: string;
  type?: 'CLIENT_RA' | 'VENDOR_INVOICE';
}
