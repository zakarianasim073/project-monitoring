
import React, { useState } from 'react';
import { ProjectState, ProjectDocument, BOQItem, UserRole, CostBreakdown, Bill, ExtractedBill } from '../types';
import { Download, PlusCircle, CheckCircle2, Clock, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Lock, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, Loader2, Zap, Package, X, Save, Edit2 } from 'lucide-react';
import DocumentManager from './DocumentManager';
import { extractBillData, suggestActualCostBreakdown, parseRunningBillDetails } from '../services/geminiService';

interface FinancialControlProps {
  data: ProjectState;
  onAddDocument: (doc: ProjectDocument) => void;
  onUpdateBOQItem?: (itemId: string, updatedItem: Partial<BOQItem>) => void;
  onAddBill: (bill: Bill) => void;
  onUpdatePDRemarks: (type: 'BILL', id: string, remarks: string) => void;
  onBillItemizedUpdate: (items: { boqId: string; amount: number }[]) => void;
  userRole: UserRole;
}

const FinancialControl: React.FC<FinancialControlProps> = ({ data, onAddDocument, onUpdateBOQItem, onAddBill, onUpdatePDRemarks, onBillItemizedUpdate, userRole }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');

  // Bill Form
  const [billType, setBillType] = useState<Bill['type']>('VENDOR_INVOICE');
  const [billEntity, setBillEntity] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [aiAutofilled, setAiAutofilled] = useState(false);
  const [detectedBillDocName, setDetectedBillDocName] = useState('');

  const canAddClientBill = userRole === 'MANAGER' || userRole === 'DIRECTOR';
  const canAddVendorBill = userRole === 'ACCOUNTANT' || userRole === 'DIRECTOR';
  const canUploadDoc = canAddClientBill || canAddVendorBill;
  const isDirector = userRole === 'DIRECTOR';

  const clientBills = data.bills.filter(b => b.type === 'CLIENT_RA');
  const vendorBills = data.bills.filter(b => b.type === 'VENDOR_INVOICE' || b.type === 'MATERIAL_EXPENSE' || b.type === 'SUB_CONTRACTOR');

  const totalRevenue = clientBills.reduce((acc, b) => acc + b.amount, 0);
  const totalExpenses = vendorBills.reduce((acc, b) => acc + b.amount, 0);
  const netFinancialPosition = totalRevenue - totalExpenses;
  
  // Material Value Calculation
  const materialInventoryValue = data.materials.reduce((sum, mat) => sum + (mat.currentStock * mat.averageRate), 0);

  const analyzedItems = data.boq.filter(item => item.executedQty > 0);
  const totalOperationalProfit = analyzedItems.reduce((acc, item) => {
    const margin = item.rate - (item.costAnalysis?.unitCost || item.plannedUnitCost);
    return acc + (margin * item.executedQty);
  }, 0);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleBillUploaded = (extracted: ExtractedBill) => {
    setAiAutofilled(true);
    // Assuming the document manager passed the doc name via a separate context, or we infer it. 
    // For this demo, let's assume the doc manager sets a flag or we can find the latest bill doc.
    const latestBill = data.documents.find(d => d.category === 'BILL' && d.uploadDate === new Date().toISOString().split('T')[0]);
    if (latestBill) setDetectedBillDocName(latestBill.name);

    if (extracted.type) setBillType(extracted.type === 'CLIENT_RA' ? 'CLIENT_RA' : 'VENDOR_INVOICE');
    if (extracted.entityName) setBillEntity(extracted.entityName);
    if (extracted.amount) setBillAmount(extracted.amount.toString());
    if (extracted.date) setBillDate(extracted.date);
    
    // Open the modal to show the user the pre-filled data
    setIsBillModalOpen(true);
    
    // Reset autofill indicator after 3 seconds
    setTimeout(() => setAiAutofilled(false), 5000);
  };

  const handleAiBillExtraction = async () => {
    const lastBillDoc = data.documents.find(d => d.category === 'BILL');
    if (!lastBillDoc) {
      alert("No bill documents found to analyze.");
      return;
    }
    setIsAiLoading(true);
    const extracted = await extractBillData(lastBillDoc.name);
    setDetectedBillDocName(lastBillDoc.name);
    setIsAiLoading(false);
    if (extracted) {
      alert(`AI Extracted Bill Info:\n\nEntity: ${extracted.entityName}\nAmount: ৳${extracted.amount}\nType: ${extracted.type}\n\nYou can now use these values to populate the form.`);
      handleBillUploaded(extracted);
    }
  };

  const handleAiSuggestBreakdown = async (item: BOQItem) => {
    const actualCost = item.costAnalysis?.unitCost || 0;
    if (actualCost === 0) return;

    setAnalyzingItemId(item.id);
    const breakdown = await suggestActualCostBreakdown(item.description, actualCost, item.plannedBreakdown);
    setAnalyzingItemId(null);

    if (breakdown && onUpdateBOQItem) {
      onUpdateBOQItem(item.id, {
        costAnalysis: {
          unitCost: actualCost,
          breakdown: breakdown
        }
      });
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    onAddBill({
      id: `BILL-${Date.now()}`,
      type: billType,
      entityName: billEntity,
      amount: Number(billAmount),
      date: billDate,
      status: 'PENDING'
    });

    // If it's a Client Bill and we have a detected document, try to distribute itemized billing
    if (billType === 'CLIENT_RA' && detectedBillDocName) {
      const confirmItemize = window.confirm("Do you want to automatically distribute this bill amount to BOQ items based on the uploaded document?");
      if (confirmItemize) {
        setIsAiLoading(true);
        const itemizedUpdates = await parseRunningBillDetails(detectedBillDocName, data.boq);
        onBillItemizedUpdate(itemizedUpdates);
        setIsAiLoading(false);
        alert(`Successfully mapped bill amount to ${itemizedUpdates.length} BOQ items.`);
      }
    }

    setIsBillModalOpen(false);
    setBillEntity('');
    setBillAmount('');
    setAiAutofilled(false);
    setDetectedBillDocName('');
  };

  const saveRemarks = (id: string) => {
    onUpdatePDRemarks('BILL', id, tempRemarks);
    setEditingRemarksId(null);
  };

  const BillTable = ({ bills, title }: { bills: typeof data.bills, title: string }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button className="p-2 text-slate-400 hover:text-slate-600">
          <Download className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 whitespace-nowrap">Bill ID</th>
              <th className="px-6 py-3 whitespace-nowrap">Entity / Description</th>
              <th className="px-6 py-3 whitespace-nowrap">Date</th>
              <th className="px-6 py-3 text-right whitespace-nowrap">Amount</th>
              <th className="px-6 py-3 text-center whitespace-nowrap">Status</th>
              <th className="px-6 py-3 whitespace-nowrap">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bills.map(bill => (
              <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-700">
                  {bill.id}
                  {bill.type === 'SUB_CONTRACTOR' && <div className="text-[10px] text-orange-600 font-bold">Sub-Contract</div>}
                  {bill.type === 'MATERIAL_EXPENSE' && <div className="text-[10px] text-indigo-600 font-bold">Material</div>}
                </td>
                <td className="px-6 py-3 text-slate-600 truncate max-w-[200px]">{bill.entityName}</td>
                <td className="px-6 py-3 text-slate-500">{bill.date}</td>
                <td className="px-6 py-3 text-right font-medium text-slate-900">৳{bill.amount.toLocaleString()}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    bill.status === 'PAID' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {bill.status}
                  </span>
                </td>
                <td className="px-6 py-3 min-w-[200px]">
                  {editingRemarksId === bill.id ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={tempRemarks} 
                        onChange={(e) => setTempRemarks(e.target.value)} 
                        className="w-full text-xs border border-blue-300 rounded px-1 py-0.5 outline-none"
                        autoFocus
                      />
                      <button onClick={() => saveRemarks(bill.id)} className="text-emerald-600"><Save className="w-3.5 h-3.5"/></button>
                      <button onClick={() => setEditingRemarksId(null)} className="text-red-500"><X className="w-3.5 h-3.5"/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/remark">
                      <span className="text-xs text-slate-500 italic truncate max-w-[150px]">
                        {bill.pdRemarks || (isDirector ? "Add note..." : "")}
                      </span>
                      {isDirector && (
                        <button 
                          onClick={() => { setEditingRemarksId(bill.id); setTempRemarks(bill.pdRemarks || ''); }}
                          className="opacity-0 group-hover/remark:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Control</h1>
          <p className="text-slate-500">Track Bills, Costs, and Profitability</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleAiBillExtraction}
            disabled={isAiLoading}
            className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm text-sm font-bold"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Auto-Scan Bill
          </button>
          {canAddVendorBill && (
             <button 
               onClick={() => { setIsBillModalOpen(true); setBillType('VENDOR_INVOICE'); setBillEntity(''); setBillAmount(''); setAiAutofilled(false); }}
               className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
             >
              <PlusCircle className="w-4 h-4" />
              Add Expense / Bill
            </button>
          )}
          {canAddClientBill && (
            <button 
              onClick={() => { setIsBillModalOpen(true); setBillType('CLIENT_RA'); setBillEntity(''); setBillAmount(''); setAiAutofilled(false); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <PlusCircle className="w-4 h-4" />
              Record Bill Received (PE)
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-2">
             <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Wallet className="w-5 h-5" />
             </div>
           </div>
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</p>
           <h2 className="text-2xl font-bold text-slate-800 mt-1">৳{totalRevenue.toLocaleString()}</h2>
           <p className="text-xs text-slate-400 mt-1">Total Billed to Client</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-2">
             <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <ArrowDownRight className="w-5 h-5" />
             </div>
           </div>
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Expenses</p>
           <h2 className="text-2xl font-bold text-slate-800 mt-1">৳{totalExpenses.toLocaleString()}</h2>
           <p className="text-xs text-slate-400 mt-1">Vendor + Sub-contract + Materials</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="flex justify-between items-start mb-2">
             <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Package className="w-5 h-5" />
             </div>
           </div>
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Material Inventory Value</p>
           <h2 className="text-2xl font-bold text-slate-800 mt-1">৳{materialInventoryValue.toLocaleString()}</h2>
           <p className="text-xs text-slate-400 mt-1">Asset Value in Stock</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden border-l-4 border-l-violet-500">
           <div className="flex justify-between items-start mb-2">
             <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                <TrendingUp className="w-5 h-5" />
             </div>
           </div>
           <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Operational Health</p>
           <h2 className={`text-2xl font-bold mt-1 ${totalOperationalProfit >= 0 ? 'text-violet-700' : 'text-red-600'}`}>
             {totalOperationalProfit >= 0 ? '+' : ''}৳{totalOperationalProfit.toLocaleString()}
           </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Unit Cost & Billing Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-8"></th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Selling Rate</th>
                <th className="px-6 py-3 text-right">Actual Unit Cost</th>
                <th className="px-6 py-3 text-right">Billed Amount (PE)</th>
                <th className="px-6 py-3 text-right">Pending Bill Amount</th>
                <th className="px-6 py-3 text-right">Profit Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.boq.map((item) => {
                if (item.executedQty === 0) return null;
                const actualCost = item.costAnalysis?.unitCost || 0;
                const margin = item.rate - actualCost;
                const totalPL = margin * item.executedQty;
                const hasBreakdown = !!item.costAnalysis?.breakdown;
                
                const workDoneValue = item.executedQty * item.rate;
                const billed = item.billedAmount || 0;
                const pendingBill = Math.max(0, workDoneValue - billed);

                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedRow === item.id ? 'bg-slate-50' : ''}`}
                      onClick={() => toggleRow(item.id)}
                    >
                      <td className="px-6 py-4 text-center">
                        {expandedRow === item.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {item.description}
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{item.id}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900">৳{item.rate.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-mono">৳{actualCost.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-emerald-700 font-bold bg-emerald-50/50">
                        ৳{billed.toLocaleString()}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${pendingBill > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                         {pendingBill > 0 ? `৳${pendingBill.toLocaleString()}` : '-'}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                         ৳{totalPL.toLocaleString()}
                      </td>
                    </tr>
                    {expandedRow === item.id && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="ml-8 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actual Cost Breakdown (Per Unit)</h4>
                               {(!hasBreakdown || Object.values(item.costAnalysis!.breakdown).every(v => v === 0)) && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleAiSuggestBreakdown(item); }}
                                   disabled={analyzingItemId === item.id}
                                   className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                 >
                                   {analyzingItemId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-current" />}
                                   AI Suggest Breakdown
                                 </button>
                               )}
                            </div>
                            
                            {hasBreakdown ? (
                              <div className="grid grid-cols-4 gap-6 text-center">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Material</p>
                                  <p className="text-lg font-mono font-bold text-slate-800">৳{item.costAnalysis?.breakdown.material.toLocaleString()}</p>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${(item.costAnalysis?.breakdown.material || 0) / actualCost * 100}%` }}></div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Labor</p>
                                  <p className="text-lg font-mono font-bold text-slate-800">৳{item.costAnalysis?.breakdown.labor.toLocaleString()}</p>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500" style={{ width: `${(item.costAnalysis?.breakdown.labor || 0) / actualCost * 100}%` }}></div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Equipment</p>
                                  <p className="text-lg font-mono font-bold text-slate-800">৳{item.costAnalysis?.breakdown.equipment.toLocaleString()}</p>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${(item.costAnalysis?.breakdown.equipment || 0) / actualCost * 100}%` }}></div>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Overhead</p>
                                  <p className="text-lg font-mono font-bold text-slate-800">৳{item.costAnalysis?.breakdown.overhead.toLocaleString()}</p>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-violet-500" style={{ width: `${(item.costAnalysis?.breakdown.overhead || 0) / actualCost * 100}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-4 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                <Lock className="w-4 h-4 opacity-20" />
                                <p>No detailed breakdown available for actual cost.</p>
                                <p className="text-[10px]">Use "AI Suggest" to decompose the total ৳{actualCost} based on planned metrics.</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
        <BillTable bills={clientBills} title="Client RA Bills" />
        <BillTable bills={vendorBills} title="Vendor Invoices (Payables)" />
      </div>

      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">
                  {billType === 'CLIENT_RA' ? 'Record Bill Received (PE)' : 'Add Expense / Invoice'}
                </h3>
                {aiAutofilled && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded animate-pulse">
                    <CheckCircle2 className="w-3 h-3" />
                    AI Auto-Filled
                  </div>
                )}
              </div>
              <button onClick={() => setIsBillModalOpen(false)}><X className="w-5 h-5 text-slate-400"/></button>
            </div>
            <form onSubmit={handleCreateBill} className="p-6 space-y-4">
               {billType !== 'CLIENT_RA' && (
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Expense Type</label>
                   <select 
                     value={billType} 
                     onChange={(e) => setBillType(e.target.value as any)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                   >
                     <option value="VENDOR_INVOICE">General Vendor Invoice</option>
                     <option value="MATERIAL_EXPENSE">Material Purchase</option>
                     <option value="SUB_CONTRACTOR">Sub-Contractor Bill</option>
                   </select>
                 </div>
               )}
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    Entity Name
                    {aiAutofilled && <Sparkles className="w-2.5 h-2.5 text-emerald-500" />}
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={billEntity} 
                    onChange={(e) => setBillEntity(e.target.value)}
                    placeholder="e.g. ABC Constructions Ltd."
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${aiAutofilled ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-300'}`}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    Amount (৳)
                    {aiAutofilled && <Sparkles className="w-2.5 h-2.5 text-emerald-500" />}
                  </label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    value={billAmount} 
                    onChange={(e) => setBillAmount(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${aiAutofilled ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-300'}`}
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    Date
                    {aiAutofilled && <Sparkles className="w-2.5 h-2.5 text-emerald-500" />}
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={billDate} 
                    onChange={(e) => setBillDate(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all ${aiAutofilled ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-300'}`}
                  />
               </div>
               
               {billType === 'CLIENT_RA' && detectedBillDocName && (
                 <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <p className="text-xs text-blue-700">
                     <strong>AI Action:</strong> Upon saving, the system will read <em>"{detectedBillDocName}"</em> to automatically distribute the billed amount to individual BOQ items.
                   </p>
                 </div>
               )}

               <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700">
                 Save Record {billType === 'CLIENT_RA' && detectedBillDocName ? '& Auto-Distribute' : ''}
               </button>
            </form>
          </div>
        </div>
      )}

      <DocumentManager 
        documents={data.documents} 
        onAddDocument={onAddDocument} 
        onBillUploaded={handleBillUploaded}
        filterModule="FINANCE" 
        compact={true}
        allowUpload={canUploadDoc}
      />
    </div>
  );
};

export default FinancialControl;
