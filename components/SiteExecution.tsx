
import React, { useState, useMemo } from 'react';
import { ProjectState, ProjectDocument, DPR, UserRole, MaterialConsumption, Unit } from '../types';
import DocumentManager from './DocumentManager';
import { MapPin, Users, Calendar, PlusCircle, X, ClipboardCheck, Lock, Sparkles, Loader2, FileText, CheckCircle2, Package, ArrowDownLeft, ArrowUpRight, Edit2, Save, HardHat } from 'lucide-react';
import { extractDPRData } from '../services/geminiService';

interface SiteExecutionProps {
  data: ProjectState;
  onAddDocument: (doc: ProjectDocument) => void;
  onAddDPR: (dpr: DPR) => void;
  onReceiveMaterial: (materialId: string, qty: number, rate?: number) => void;
  onUpdatePDRemarks: (type: 'MATERIAL' | 'SUBCONTRACTOR', id: string, remarks: string) => void;
  userRole: UserRole;
}

const SiteExecution: React.FC<SiteExecutionProps> = ({ data, onAddDocument, onAddDPR, onReceiveMaterial, onUpdatePDRemarks, userRole }) => {
  const [isDprModalOpen, setIsDprModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPopulatedFields, setAiPopulatedFields] = useState<Set<string>>(new Set());
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [editingRemarksId, setEditingRemarksId] = useState<string | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');
  
  const canAddDPR = userRole === 'ENGINEER' || userRole === 'DIRECTOR';
  const canUploadDoc = userRole === 'ENGINEER' || userRole === 'DIRECTOR';
  const canManageStore = userRole === 'ENGINEER' || userRole === 'MANAGER' || userRole === 'DIRECTOR';
  const isDirector = userRole === 'DIRECTOR';

  // DPR Form State
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityDesc, setActivityDesc] = useState('');
  const [location, setLocation] = useState('');
  const [laborCount, setLaborCount] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [linkedBoqId, setLinkedBoqId] = useState('');
  const [subContractorId, setSubContractorId] = useState('');
  const [workDoneQty, setWorkDoneQty] = useState(0);
  const [materialsConsumed, setMaterialsConsumed] = useState<MaterialConsumption[]>([]);

  // Receive Material Form State
  const [receiveMatId, setReceiveMatId] = useState('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveRate, setReceiveRate] = useState('');

  const reportDocs = useMemo(() => 
    data.documents
      .filter(d => d.category === 'REPORT')
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()),
    [data.documents]
  );

  const handleCreateDPR = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDesc = activityDesc;
    if (linkedBoqId && !finalDesc) {
      const boqItem = data.boq.find(b => b.id === linkedBoqId);
      if (boqItem) finalDesc = boqItem.description;
    }

    const newDPR: DPR = {
      id: `DPR-${Date.now()}`,
      date: activityDate,
      activity: finalDesc || 'Site Activity',
      location: location || 'Site',
      laborCount: Number(laborCount),
      remarks,
      linkedBoqId: linkedBoqId || undefined,
      subContractorId: subContractorId || undefined,
      workDoneQty: Number(workDoneQty) > 0 ? Number(workDoneQty) : undefined,
      materialsUsed: materialsConsumed.filter(m => m.qty > 0)
    };

    onAddDPR(newDPR);
    setIsDprModalOpen(false);
    resetForm();
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(receiveMatId && receiveQty) {
      onReceiveMaterial(receiveMatId, Number(receiveQty), receiveRate ? Number(receiveRate) : undefined);
      setIsReceiveModalOpen(false);
      setReceiveMatId('');
      setReceiveQty('');
      setReceiveRate('');
    }
  };

  const resetForm = () => {
    setActivityDesc('');
    setLocation('');
    setLaborCount(0);
    setRemarks('');
    setLinkedBoqId('');
    setSubContractorId('');
    setWorkDoneQty(0);
    setAiPopulatedFields(new Set());
    setSelectedReportId('');
    setMaterialsConsumed([]);
  };

  const handleAiAutoFill = async () => {
    const reportToAnalyze = selectedReportId 
      ? reportDocs.find(d => d.id === selectedReportId)
      : reportDocs[0];

    if (!reportToAnalyze) {
      alert("Please upload or select a site report to analyze.");
      return;
    }

    setIsAiLoading(true);
    const extracted = await extractDPRData(reportToAnalyze.name, data.boq);
    setIsAiLoading(false);

    if (extracted) {
      const newPopulated = new Set<string>();
      if (extracted.date) { setActivityDate(extracted.date); newPopulated.add('date'); }
      if (extracted.activity) { setActivityDesc(extracted.activity); newPopulated.add('activity'); }
      if (extracted.location) { setLocation(extracted.location); newPopulated.add('location'); }
      if (extracted.laborCount) { setLaborCount(extracted.laborCount); newPopulated.add('labor'); }
      if (extracted.remarks) { setRemarks(extracted.remarks); newPopulated.add('remarks'); }
      if (extracted.linkedBoqId) { setLinkedBoqId(extracted.linkedBoqId); newPopulated.add('boq'); }
      if (extracted.workDoneQty) { setWorkDoneQty(extracted.workDoneQty); newPopulated.add('qty'); }
      
      // Auto-select subcontractor if name matches
      if (extracted.subContractorName) {
         const match = data.subContractors?.find(s => 
           s.name.toLowerCase().includes(extracted.subContractorName!.toLowerCase()) || 
           extracted.subContractorName!.toLowerCase().includes(s.name.toLowerCase())
         );
         if (match) {
            setSubContractorId(match.id);
            newPopulated.add('subcontractor');
         }
      }

      // Map structured materials to IDs
      if (extracted.materials && extracted.materials.length > 0) {
        const mappedMaterials = extracted.materials.map(m => {
          // Fuzzy match by name
          const match = data.materials.find(ex => ex.name.toLowerCase().includes(m.name.toLowerCase()));
          return match ? { materialId: match.id, qty: m.qty } : null;
        }).filter(Boolean) as MaterialConsumption[];
        
        if (mappedMaterials.length > 0) {
          setMaterialsConsumed(mappedMaterials);
          newPopulated.add('materials');
        }
      }
      
      setAiPopulatedFields(newPopulated);
    }
  };

  const addConsumptionRow = () => {
    if (data.materials.length > 0) {
      setMaterialsConsumed([...materialsConsumed, { materialId: data.materials[0].id, qty: 0 }]);
    }
  };

  const updateConsumption = (index: number, field: keyof MaterialConsumption, value: any) => {
    const updated = [...materialsConsumed];
    updated[index] = { ...updated[index], [field]: value };
    setMaterialsConsumed(updated);
  };

  const removeConsumptionRow = (index: number) => {
    setMaterialsConsumed(materialsConsumed.filter((_, i) => i !== index));
  };

  const saveRemarks = (type: 'MATERIAL' | 'SUBCONTRACTOR', id: string) => {
    onUpdatePDRemarks(type, id, tempRemarks);
    setEditingRemarksId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Site Execution</h1>
          <p className="text-slate-500">Track Progress, Remaining Works & Daily Reports</p>
        </div>
        {canAddDPR ? (
          <button 
            onClick={() => setIsDprModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
          >
            <ClipboardCheck className="w-4 h-4" />
            Add Daily Progress
          </button>
        ) : (
           <div className="flex items-center gap-2 text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
             <Lock className="w-3 h-3" />
             <span>Read Only (Role: {userRole})</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Store Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
            <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800">Site Store & Inventory</h3>
            </div>
            {canManageStore && (
                <button 
                onClick={() => setIsReceiveModalOpen(true)}
                className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm text-xs font-bold"
                >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Receive Materials
                </button>
            )}
            </div>
            <div className="p-4 space-y-3">
            {data.materials.map(mat => (
                <div key={mat.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-700 text-sm">{mat.name}</h4>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{mat.unit}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                            <span className="text-slate-400 block">Total Recv</span>
                            <span className="text-slate-600 font-medium">{mat.totalReceived.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Consumed</span>
                            <span className="text-slate-600 font-medium">{mat.totalConsumed.toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">Stock</span>
                            <span className="font-bold text-indigo-600">{mat.currentStock.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (mat.currentStock / (mat.totalReceived || 1)) * 100)}%` }}></div>
                    </div>
                    {/* Director Remarks */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        {editingRemarksId === mat.id ? (
                            <div className="flex items-center gap-1">
                                <input 
                                    type="text" 
                                    value={tempRemarks} 
                                    onChange={(e) => setTempRemarks(e.target.value)} 
                                    className="w-full text-[10px] border border-indigo-300 rounded px-1 py-0.5 outline-none"
                                    autoFocus
                                />
                                <button onClick={() => saveRemarks('MATERIAL', mat.id)} className="text-emerald-600"><Save className="w-3 h-3"/></button>
                                <button onClick={() => setEditingRemarksId(null)} className="text-red-500"><X className="w-3 h-3"/></button>
                            </div>
                        ) : (
                            <div className="flex items-start gap-1 group/remark">
                                <p className="text-[10px] text-slate-400 italic flex-1 truncate">
                                    {mat.pdRemarks ? `Note: ${mat.pdRemarks}` : (isDirector ? "Add PD Note..." : "")}
                                </p>
                                {isDirector && (
                                    <button 
                                    onClick={() => { setEditingRemarksId(mat.id); setTempRemarks(mat.pdRemarks || ''); }}
                                    className="opacity-0 group-hover/remark:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity"
                                    >
                                    <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            {data.materials.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No materials tracked.</div>
            )}
            </div>
        </div>

        {/* Engaged Sub-Contractors Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-orange-50/50">
                <div className="flex items-center gap-2">
                    <HardHat className="w-5 h-5 text-orange-600" />
                    <h3 className="font-semibold text-slate-800">Engaged Sub-Contractors</h3>
                </div>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase">Automated from Progress</span>
            </div>
            <div className="p-4 space-y-3">
                {data.subContractors && data.subContractors.map(sc => (
                    <div key={sc.id} className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm">{sc.name}</h4>
                                <p className="text-[10px] text-slate-500">{sc.specialization}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">
                                Due: ৳{sc.currentLiability.toLocaleString()}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2 mb-1">
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="text-slate-400 block text-[10px] uppercase">Work Done Value</span>
                                <span className="text-slate-700 font-bold">৳{sc.totalWorkValue.toLocaleString()}</span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="text-slate-400 block text-[10px] uppercase">Paid / Billed</span>
                                <span className="text-slate-700 font-bold">৳{sc.totalBilled.toLocaleString()}</span>
                            </div>
                        </div>
                         {/* Director Remarks */}
                        <div className="mt-1 pt-1 border-t border-slate-100">
                            {editingRemarksId === sc.id ? (
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="text" 
                                        value={tempRemarks} 
                                        onChange={(e) => setTempRemarks(e.target.value)} 
                                        className="w-full text-[10px] border border-orange-300 rounded px-1 py-0.5 outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => saveRemarks('SUBCONTRACTOR', sc.id)} className="text-emerald-600"><Save className="w-3 h-3"/></button>
                                    <button onClick={() => setEditingRemarksId(null)} className="text-red-500"><X className="w-3 h-3"/></button>
                                </div>
                            ) : (
                                <div className="flex items-start gap-1 group/remark">
                                    <p className="text-[10px] text-slate-400 italic flex-1 truncate">
                                        {sc.pdRemarks ? `Note: ${sc.pdRemarks}` : (isDirector ? "Add PD Note..." : "")}
                                    </p>
                                    {isDirector && (
                                        <button 
                                        onClick={() => { setEditingRemarksId(sc.id); setTempRemarks(sc.pdRemarks || ''); }}
                                        className="opacity-0 group-hover/remark:opacity-100 text-slate-400 hover:text-orange-600 transition-opacity"
                                        >
                                        <Edit2 className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {(!data.subContractors || data.subContractors.length === 0) && (
                     <div className="text-center py-8 text-slate-400 text-sm">No sub-contractors engaged.</div>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800">Physical Progress & Remaining Works</h3>
          <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
            Live from Site
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-1/3">Item Description</th>
                <th className="px-6 py-4 text-right">Planned Qty</th>
                <th className="px-6 py-4 text-right">Executed Qty</th>
                <th className="px-6 py-4 text-right font-semibold text-blue-700 bg-blue-50/50">Remaining Qty</th>
                <th className="px-6 py-4 text-right">Progress %</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.boq.map((item) => {
                const percent = Math.min(100, Math.round((item.executedQty / item.plannedQty) * 100));
                const remaining = Math.max(0, item.plannedQty - item.executedQty);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {item.description}
                      <div className="text-xs text-slate-400 font-normal mt-0.5">ID: {item.id}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">{item.plannedQty.toLocaleString()} <span className="text-xs">{item.unit}</span></td>
                    <td className="px-6 py-4 text-right text-slate-900 font-medium">{item.executedQty.toLocaleString()} <span className="text-xs">{item.unit}</span></td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/30">
                      {remaining.toLocaleString()} <span className="text-xs font-normal text-blue-400">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex flex-col items-end gap-1">
                         <span className="text-xs font-bold text-slate-700">{percent}%</span>
                         <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                         </div>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {percent >= 100 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Completed
                        </span>
                      ) : percent > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DPRs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Daily Progress Reports (DPR) Log</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {data.dprs.map((dpr) => (
              <div key={dpr.id} className="p-5 hover:bg-slate-50 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <h4 className="font-medium text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{dpr.activity}</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{dpr.id}</span>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dpr.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dpr.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dpr.laborCount} Workers</span>
                  </div>
                </div>
                
                {dpr.workDoneQty && dpr.linkedBoqId && (
                  <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded">
                    + {dpr.workDoneQty} Work Done Added
                  </div>
                )}

                {dpr.subContractorId && (
                   <div className="mt-1 text-[10px] font-bold text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded border border-orange-100">
                     Engaged: {data.subContractors?.find(s => s.id === dpr.subContractorId)?.name}
                   </div>
                )}

                {dpr.materialsUsed && dpr.materialsUsed.length > 0 && (
                   <div className="mt-2 flex flex-wrap gap-2">
                     {dpr.materialsUsed.map((usage, idx) => {
                       const matName = data.materials.find(m => m.id === usage.materialId)?.name || usage.materialId;
                       return (
                         <span key={idx} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                           Consumed: {usage.qty} {data.materials.find(m => m.id === usage.materialId)?.unit} of {matName}
                         </span>
                       );
                     })}
                   </div>
                )}
                
                {dpr.remarks && (
                  <div className="mt-3 text-xs text-slate-600 italic border-l-2 border-slate-200 pl-3">
                    "{dpr.remarks}"
                  </div>
                )}
              </div>
            ))}
            {data.dprs.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">No daily reports logged yet.</div>
            )}
          </div>
        </div>

        {/* Documents */}
        <DocumentManager 
          documents={data.documents} 
          onAddDocument={onAddDocument} 
          filterModule="SITE" 
          compact={true}
          allowUpload={canUploadDoc}
        />
      </div>

       {/* Receive Material Modal */}
       {isReceiveModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
                  <h3 className="font-semibold text-slate-800">Receive Material (Inward)</h3>
                  <button onClick={() => setIsReceiveModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
               </div>
               <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Material</label>
                    <select 
                      required 
                      value={receiveMatId} 
                      onChange={(e) => setReceiveMatId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    >
                      <option value="">-- Choose --</option>
                      {data.materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity Received</label>
                    <input 
                      type="number" 
                      required 
                      min="0"
                      step="0.01"
                      value={receiveQty} 
                      onChange={(e) => setReceiveQty(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Buying Rate (Optional)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={receiveRate} 
                      onChange={(e) => setReceiveRate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                      placeholder="Update Unit Price"
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700">Add to Stock</button>
               </form>
            </div>
         </div>
       )}

       {/* DPR Modal */}
       {isDprModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-semibold text-slate-800">Add Daily Progress Report</h3>
              <button onClick={() => setIsDprModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                     <Sparkles className="w-3.5 h-3.5" />
                     AI Smart Auto-Fill
                  </div>
                  {isAiLoading && (
                    <div className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-bold animate-pulse">
                       <Loader2 className="w-3 h-3 animate-spin" /> Analyzing Report...
                    </div>
                  )}
               </div>
               <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    >
                       <option value="">{reportDocs.length > 0 ? '-- Use Latest Report --' : 'No reports available'}</option>
                       {reportDocs.map(doc => (
                         <option key={doc.id} value={doc.id}>{doc.name} ({doc.uploadDate})</option>
                       ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleAiAutoFill}
                    disabled={isAiLoading || reportDocs.length === 0}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    Auto-Fill
                  </button>
               </div>
               {aiPopulatedFields.size > 0 && (
                 <div className="text-[10px] text-indigo-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Successfully updated {aiPopulatedFields.size} fields
                 </div>
               )}
            </div>

            <form onSubmit={handleCreateDPR} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    Date
                    {aiPopulatedFields.has('date') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                  </label>
                  <input 
                    type="date" 
                    required
                    value={activityDate}
                    onChange={(e) => {
                      setActivityDate(e.target.value);
                      const next = new Set(aiPopulatedFields); next.delete('date'); setAiPopulatedFields(next);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('date') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    Labor Count
                    {aiPopulatedFields.has('labor') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                   </label>
                   <input 
                    type="number"
                    min="0"
                    value={laborCount}
                    onChange={(e) => {
                      setLaborCount(Number(e.target.value));
                      const next = new Set(aiPopulatedFields); next.delete('labor'); setAiPopulatedFields(next);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('labor') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Link to BOQ Item (Activity Type)
                  {aiPopulatedFields.has('boq') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                </label>
                <select 
                  value={linkedBoqId}
                  onChange={(e) => {
                    setLinkedBoqId(e.target.value);
                    const next = new Set(aiPopulatedFields); next.delete('boq'); setAiPopulatedFields(next);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white transition-all ${aiPopulatedFields.has('boq') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                >
                  <option value="">-- General Activity (No BOQ Update) --</option>
                  {data.boq.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.id} - {item.description.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>
              
              {(linkedBoqId || aiPopulatedFields.has('qty')) && (
                 <div className={`p-4 rounded-lg border transition-all space-y-3 ${aiPopulatedFields.has('qty') ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-100'}`}>
                    <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1 flex items-center gap-1">
                            Work Done Today (Quantity)
                            {aiPopulatedFields.has('qty') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                        </label>
                        <div className="flex items-center gap-2">
                            <input 
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={workDoneQty}
                            onChange={(e) => {
                              setWorkDoneQty(Number(e.target.value));
                              const next = new Set(aiPopulatedFields); next.delete('qty'); setAiPopulatedFields(next);
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('qty') ? 'border-indigo-300 bg-white' : 'border-blue-200 bg-white'}`}
                            />
                            <span className="text-sm font-medium text-blue-600">
                                {data.boq.find(b => b.id === linkedBoqId)?.unit}
                            </span>
                        </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                         Engaged Sub-Contractor
                         {aiPopulatedFields.has('subcontractor') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                      </label>
                      <select 
                         value={subContractorId}
                         onChange={(e) => {
                           setSubContractorId(e.target.value);
                           const next = new Set(aiPopulatedFields); next.delete('subcontractor'); setAiPopulatedFields(next);
                         }}
                         className={`w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all ${aiPopulatedFields.has('subcontractor') ? 'border-indigo-300 bg-white' : 'border-slate-300 bg-white'}`}
                      >
                         <option value="">-- No Sub-Contractor (Direct Labor) --</option>
                         {data.subContractors?.map(sc => (
                           <option key={sc.id} value={sc.id}>
                             {sc.name} - (Rate: ৳{sc.agreedRates.find(r => r.boqId === linkedBoqId)?.rate || 0})
                           </option>
                         ))}
                      </select>
                      {subContractorId && linkedBoqId && (
                         <div className="text-[10px] text-orange-600 mt-1">
                            * Liability will be automatically created: ৳{(Number(workDoneQty) * (data.subContractors?.find(s => s.id === subContractorId)?.agreedRates.find(r => r.boqId === linkedBoqId)?.rate || 0)).toLocaleString()}
                         </div>
                      )}
                    </div>
                 </div>
              )}
              
              {/* Material Consumption Section */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <div className="flex justify-between items-center mb-2">
                   <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 uppercase">Materials Consumed Today</label>
                      {aiPopulatedFields.has('materials') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                   </div>
                   <button type="button" onClick={addConsumptionRow} className="text-indigo-600 text-xs font-bold flex items-center gap-1">
                     <PlusCircle className="w-3 h-3" /> Add Material
                   </button>
                 </div>
                 <div className="space-y-2">
                   {materialsConsumed.map((row, idx) => (
                     <div key={idx} className="flex gap-2 items-center">
                       <select 
                         value={row.materialId}
                         onChange={(e) => updateConsumption(idx, 'materialId', e.target.value)}
                         className={`flex-1 text-xs border rounded px-2 py-1.5 ${aiPopulatedFields.has('materials') ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-300'}`}
                       >
                         {data.materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                       <input 
                         type="number" 
                         value={row.qty} 
                         onChange={(e) => updateConsumption(idx, 'qty', Number(e.target.value))}
                         className={`w-20 text-xs border rounded px-2 py-1.5 ${aiPopulatedFields.has('materials') ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-300'}`}
                         placeholder="Qty"
                       />
                       <span className="text-xs text-slate-500 w-8">{data.materials.find(m => m.id === row.materialId)?.unit}</span>
                       <button type="button" onClick={() => removeConsumptionRow(idx)} className="text-red-500"><X className="w-3 h-3"/></button>
                     </div>
                   ))}
                   {materialsConsumed.length === 0 && <p className="text-xs text-slate-400 italic">No materials added.</p>}
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Activity Description
                  {aiPopulatedFields.has('activity') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                </label>
                <input 
                  type="text" 
                  value={activityDesc}
                  onChange={(e) => {
                    setActivityDesc(e.target.value);
                    const next = new Set(aiPopulatedFields); next.delete('activity'); setAiPopulatedFields(next);
                  }}
                  placeholder={linkedBoqId ? "Auto-filled from BOQ if empty" : "e.g., Site Clearing, Mobilization"}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('activity') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Location
                  {aiPopulatedFields.has('location') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                </label>
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    const next = new Set(aiPopulatedFields); next.delete('location'); setAiPopulatedFields(next);
                  }}
                  placeholder="e.g., Chainage 10+500"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('location') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  Remarks / Issues
                  {aiPopulatedFields.has('remarks') && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                </label>
                <textarea 
                  rows={3}
                  value={remarks}
                  onChange={(e) => {
                    setRemarks(e.target.value);
                    const next = new Set(aiPopulatedFields); next.delete('remarks'); setAiPopulatedFields(next);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all ${aiPopulatedFields.has('remarks') ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300'}`}
                  placeholder="Any notes..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => { setIsDprModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md active:scale-95"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteExecution;
