
import { ProjectState, Unit } from './types';

export const MOCK_PROJECTS: ProjectState[] = [
  {
    id: 'P001',
    name: "Bank Protective Work at Munshirhat, Gaibandha (BWDB)",
    status: 'ACTIVE',
    priority: 'HIGH',
    contractValue: 181592188,
    startDate: "2023-09-25",
    endDate: "2026-03-28",
    materials: [
      { id: 'MAT-01', name: 'Portland Composite Cement', unit: Unit.BAG, totalReceived: 5000, totalConsumed: 4200, currentStock: 800, averageRate: 540, pdRemarks: 'Ensure Holcim brand for casting' },
      { id: 'MAT-02', name: 'Sylhet Sand (FM 2.5)', unit: Unit.CFT, totalReceived: 20000, totalConsumed: 15000, currentStock: 5000, averageRate: 45 },
      { id: 'MAT-03', name: 'Stone Chips (3/4")', unit: Unit.CFT, totalReceived: 35000, totalConsumed: 28000, currentStock: 7000, averageRate: 185 },
      { id: 'MAT-04', name: 'Geo-Textile Bags', unit: Unit.NOS, totalReceived: 50000, totalConsumed: 20404, currentStock: 29596, averageRate: 28 }
    ],
    subContractors: [
      { 
        id: 'SC-01', 
        name: 'Sweet Chairman', 
        specialization: 'Earth Work & Geo-Bag', 
        totalWorkValue: 450000, 
        totalBilled: 155762, 
        currentLiability: 294238, 
        agreedRates: [
          { boqId: '40-370-20', rate: 45.00 }, // Dumping Geo-bag labor rate
          { boqId: '40-920', rate: 30.00 } // Earth work labor rate
        ],
        pdRemarks: 'Hold 10% retention from next bill.'
      },
      { 
        id: 'SC-02', 
        name: 'M/S Rahman Enterprise', 
        specialization: 'CC Block Casting', 
        totalWorkValue: 1200000, 
        totalBilled: 1000000, 
        currentLiability: 200000, 
        agreedRates: [
          { boqId: '40-190-35', rate: 65.00 }, // Block casting labor rate
        ]
      }
    ],
    boq: [
      { 
        id: '40-920', 
        description: 'Earth work in cutting and filling of eroded bank', 
        unit: Unit.CUM, 
        rate: 123.59, 
        plannedUnitCost: 105.00,
        plannedBreakdown: { material: 50, labor: 30, equipment: 20, overhead: 5 },
        plannedQty: 27977, 
        executedQty: 27977,
        billedAmount: 3000000, // Partial billing
        priority: 'MEDIUM',
        costAnalysis: {
          unitCost: 115.00,
          breakdown: { material: 80, labor: 25, equipment: 10, overhead: 0 }
        }
      },
      { 
        id: '40-370-20', 
        description: 'Supply, Filling and Dumping of Geo-bag', 
        unit: Unit.NOS, 
        rate: 295.00, 
        plannedUnitCost: 250.00,
        plannedBreakdown: { material: 200, labor: 30, equipment: 15, overhead: 5 },
        plannedQty: 20404, 
        executedQty: 20404,
        billedAmount: 6019180, // Fully billed
        priority: 'HIGH',
        costAnalysis: {
          unitCost: 280.00,
          breakdown: { material: 220, labor: 40, equipment: 10, overhead: 10 }
        }
      },
      { 
        id: '40-190-35', 
        description: 'CC blocks(1:2.5:5): 40cm x 40cm x 40cm', 
        unit: Unit.NOS, 
        rate: 852.00, 
        plannedUnitCost: 800.00,
        plannedBreakdown: { material: 550, labor: 150, equipment: 70, overhead: 30 },
        plannedQty: 47000, 
        executedQty: 18896,
        billedAmount: 12000000,
        priority: 'HIGH',
        costAnalysis: {
          unitCost: 910.00,
          breakdown: { material: 600, labor: 200, equipment: 80, overhead: 30 }
        }
      },
      { 
        id: '40-190-50', 
        description: 'CC blocks(1:2.5:5): 30cm x 30cm x 30cm', 
        unit: Unit.NOS, 
        rate: 362.00, 
        plannedUnitCost: 310.00,
        plannedBreakdown: { material: 180, labor: 100, equipment: 20, overhead: 10 },
        plannedQty: 70370, 
        executedQty: 32049,
        billedAmount: 11000000,
        priority: 'MEDIUM',
        costAnalysis: {
          unitCost: 330.00, 
          breakdown: { material: 200, labor: 100, equipment: 20, overhead: 10 }
        }
      },
      { 
        id: '40-190-40', 
        description: 'CC blocks(1:2.5:5): 40cm x 40cm x 20cm', 
        unit: Unit.NOS, 
        rate: 432.00, 
        plannedUnitCost: 380.00,
        plannedBreakdown: { material: 250, labor: 100, equipment: 20, overhead: 10 },
        plannedQty: 118260, 
        executedQty: 15344,
        billedAmount: 0,
        priority: 'LOW',
        costAnalysis: {
          unitCost: 400.00,
          breakdown: { material: 280, labor: 100, equipment: 10, overhead: 10 }
        }
      },
      { 
        id: '40-290-10', 
        description: 'Dumping of stone/boulders/blocks by boat: Within 200m', 
        unit: Unit.CUM, 
        rate: 1638.00, 
        plannedUnitCost: 1450.00,
        plannedBreakdown: { material: 1100, labor: 250, equipment: 100, overhead: 0 },
        plannedQty: 3926.39, 
        executedQty: 981.60,
        billedAmount: 0,
        priority: 'MEDIUM',
        costAnalysis: {
          unitCost: 1400.00,
          breakdown: { material: 1000, labor: 300, equipment: 100, overhead: 0 }
        }
      },
      { 
        id: '40-500-40', 
        description: 'Supply and laying geotex filter', 
        unit: Unit.SQM, 
        rate: 202.00, 
        plannedUnitCost: 175.00,
        plannedBreakdown: { material: 140, labor: 35, equipment: 0, overhead: 0 },
        plannedQty: 24187.50, 
        executedQty: 12500,
        billedAmount: 2000000,
        priority: 'LOW',
        costAnalysis: {
          unitCost: 180.00,
          breakdown: { material: 150, labor: 30, equipment: 0, overhead: 0 }
        }
      },
    ],
    dprs: [
      { id: '105', date: '2024-11-19', activity: 'CC Block Manufacturing (Package-Munshirhat 01)', location: 'Casting Yard', laborCount: 30, remarks: 'Produced 97 nos 50x50x50 and 246 nos 40x40x40 blocks.', linkedBoqId: '40-190-35', subContractorId: 'SC-02', workDoneQty: 97, materialsUsed: [{ materialId: 'MAT-01', qty: 138 }, { materialId: 'MAT-02', qty: 250 }] },
      { id: '106', date: '2024-11-19', activity: 'Geo-Bag Dumping by Boat', location: 'River Bank', laborCount: 19, remarks: 'Cumulative dumping progress 46.87%', linkedBoqId: '40-370-20', subContractorId: 'SC-01', workDoneQty: 150 },
      { id: '107', date: '2024-12-30', activity: 'Monthly Reconciliation', location: 'Site Office', laborCount: 4, remarks: 'Gaibandha Munshirhat Block Casting Work Done Vol: 103385 cft' },
    ],
    bills: [
      { id: 'RA-08', type: 'CLIENT_RA', entityName: 'BWDB Gaibandha O&M Division', amount: 12500000, date: '2024-10-15', status: 'PAID' },
      { id: 'RA-09', type: 'CLIENT_RA', entityName: 'BWDB Gaibandha O&M Division', amount: 8599950, date: '2025-04-07', status: 'PENDING' },
      { id: 'SUP-01', type: 'MATERIAL_EXPENSE', entityName: 'Hassan & Brothers Ltd (Supplier)', amount: 450000, date: '2024-11-20', status: 'PAID' },
      { id: 'SUP-02', type: 'SUB_CONTRACTOR', entityName: 'Sweet Chairman (Sub-contractor)', amount: 155762, date: '2024-11-19', status: 'PENDING' },
    ],
    liabilities: [
      { id: 'L001', description: 'Security Deposit (Retention 10%)', type: 'RETENTION', amount: 1250000, dueDate: '2026-03-28' },
      { id: 'L002', description: 'Pending PO - Stone Chips (Sylhet)', type: 'PENDING_PO', amount: 867802, dueDate: '2024-12-01' },
      { id: 'L003', description: 'Unbilled Labor (Nov)', type: 'UNBILLED_WORK', amount: 45000, dueDate: '2024-12-05' },
    ],
    milestones: [
      { id: 'M1', title: 'Site Mobilization', date: '2023-10-01', status: 'COMPLETED', description: 'Site office setup and initial equipment deployment' },
      { id: 'M2', title: 'Geo-Bag Dumping Completion', date: '2024-12-30', status: 'COMPLETED', description: 'Primary river bank protection layer' },
      { id: 'M3', title: 'CC Block Casting (50%)', date: '2025-06-01', status: 'AT_RISK', description: 'Target 50% of total block volume cast' },
      { id: 'M4', title: 'Pre-Monsoon Protection', date: '2025-05-15', status: 'PENDING', description: 'Critical protection works before water level rise' }
    ],
    documents: [
      { id: 'D001', name: 'Running Bill RA-09.pdf', type: 'PDF', category: 'BILL', module: 'FINANCE', uploadDate: '2025-04-07', size: '1.4 MB' },
      { id: 'D002', name: 'Daily Progress Report_19.11.25.pdf', type: 'PDF', category: 'REPORT', module: 'SITE', uploadDate: '2024-11-19', size: '2.1 MB' },
      { id: 'D003', name: 'Profit_Loss_Summary_30.12.2024.xlsx', type: 'XLSX', category: 'REPORT', module: 'FINANCE', uploadDate: '2024-12-30', size: '0.5 MB' },
      { id: 'D004', name: 'BOQ_Schedule.pdf', type: 'PDF', category: 'CONTRACT', module: 'MASTER', uploadDate: '2023-09-01', size: '3.8 MB' },
    ],
    aiSuggestions: []
  },
  {
    id: 'P002',
    name: "River Bank Protection at Kurigram",
    status: 'ON_HOLD',
    priority: 'MEDIUM',
    contractValue: 95000000,
    startDate: "2024-01-10",
    endDate: "2025-06-30",
    materials: [
       { id: 'MAT-01', name: 'Cement', unit: Unit.BAG, totalReceived: 2000, totalConsumed: 500, currentStock: 1500, averageRate: 530 },
    ],
    subContractors: [],
    boq: [
      { 
        id: 'K-01', 
        description: 'Excavation Work', 
        unit: Unit.CUM, 
        rate: 110.00, 
        plannedUnitCost: 85.00,
        plannedBreakdown: { material: 0, labor: 50, equipment: 30, overhead: 5 },
        plannedQty: 50000, 
        executedQty: 12000,
        billedAmount: 1000000,
        priority: 'HIGH',
        costAnalysis: {
          unitCost: 95.00,
          breakdown: { material: 0, labor: 60, equipment: 35, overhead: 0 }
        }
      },
      { 
        id: 'K-02', 
        description: 'CC Block Casting', 
        unit: Unit.NOS, 
        rate: 450.00, 
        plannedUnitCost: 390.00,
        plannedBreakdown: { material: 300, labor: 70, equipment: 10, overhead: 10 },
        plannedQty: 80000, 
        executedQty: 0,
        billedAmount: 0,
        priority: 'LOW',
        costAnalysis: {
          unitCost: 400.00,
          breakdown: { material: 300, labor: 80, equipment: 10, overhead: 10 }
        }
      },
    ],
    dprs: [],
    bills: [],
    liabilities: [],
    milestones: [
        { id: 'M1', title: 'Contract Signing', date: '2024-01-05', status: 'COMPLETED' },
        { id: 'M2', title: 'Project Resume', date: '2025-02-01', status: 'PENDING', description: 'Restart work after hold' }
    ],
    documents: [],
    aiSuggestions: []
  }
];
