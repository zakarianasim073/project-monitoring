
import React, { useState, useMemo, useEffect } from 'react';
import { ProjectState, ProjectDocument, UserRole, BOQItem, Unit, Priority } from '../types';
import DocumentManager from './DocumentManager';
import { 
  PlusCircle, 
  X, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Activity,
  RotateCcw,
  Sparkles,
  Loader2,
  ChevronUp,
  Layers,
  Flag,
  Save,
  Info,
  CheckCircle2,
  FileText,
  UploadCloud,
  Link as LinkIcon,
  Download,
  FileUp
} from 'lucide-react';
import { suggestPlannedUnitCost, parseBOQDocument } from '../services/geminiService';

interface MasterControlProps {
  data: ProjectState;
  onAddDocument: (doc: ProjectDocument) => void;
  onAddBOQItem: (item: BOQItem) => void;
  onUpdateBOQItem?: (itemId: string, updatedItem: Partial<BOQItem>) => void;
  onImportBOQItems: (items: BOQItem[]) => void;
  userRole: UserRole;
}

type SortField = 'id' | 'rate' | 'plannedUnitCost' | 'plannedQty' | 'executedQty' | 'progress' | 'revenue' | 'variance' | 'profit' | 'priority';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

const MasterControl: React.FC<MasterControlProps> = ({ data, onAddDocument, onAddBOQItem, onUpdateBOQItem, onImportBOQItems, userRole }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState<Unit | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Import State
  const [importTab, setImportTab] = useState<'EXISTING' | 'UPLOAD'>('EXISTING');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Editing state for breakdown
  const [editId, setEditId] = useState<string | null>(null);
  const [editMat, setEditMat] = useState<string>('0');
  const [editLab, setEditLab] = useState<string>('0');
  const [editEqp, setEditEqp] = useState<string>('0');
  const [editOH, setEditOH] = useState<string>('0');

  const canEditBOQ = userRole === 'DIRECTOR' || userRole === 'MANAGER';

  // Form State for Adding Item
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<Unit>(Unit.CUM);
  const [rate, setRate] = useState<string>('');
  const [plannedUnitCost, setPlannedUnitCost] = useState<string>('');
  const [itemPriority, setItemPriority] = useState<Priority>('MEDIUM');
  const [plannedQty, setPlannedQty] = useState<string>('');
  
  // Breakdown states for new item
  const [plannedMat, setPlannedMat] = useState<string>('0');
  const [plannedLab, setPlannedLab] = useState<string>('0');
  const [plannedEqp, setPlannedEqp] = useState<string>('0');
  const [plannedOH, setPlannedOH] = useState<string>('0');
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiAppliedFields, setAiAppliedFields] = useState<boolean>(false);

  // Auto-calculate plannedUnitCost when breakdown changes for NEW item
  useEffect(() => {
    const total = Number(plannedMat) + Number(plannedLab) + Number(plannedEqp) + Number(plannedOH);
    setPlannedUnitCost(total.toString());
  }, [plannedMat, plannedLab, plannedEqp, plannedOH]);

  // Use all documents for import selection to give user full flexibility
  const availableDocs = data.documents;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: BOQItem = {
      id: `${(data.boq.length + 1) * 10}-NEW`,
      description,
      unit,
      rate: Number(rate),
      priority: itemPriority,
      plannedUnitCost: Number(plannedUnitCost),
      plannedBreakdown: {
        material: Number(plannedMat),
        labor: Number(plannedLab),
        equipment: Number(plannedEqp),
        overhead: Number(plannedOH)
      },
      plannedQty: Number(plannedQty),
      executedQty: 0
    };
    onAddBOQItem(newItem);
    setIsModalOpen(false);
    resetForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (importTab === 'EXISTING' && !selectedFileId) return;
    if (importTab === 'UPLOAD' && !fileToUpload) return;

    setIsImporting(true);
    
    try {
      let docName = '';
      
      if (importTab === 'UPLOAD' && fileToUpload) {
         setImportStatus('Uploading & Scanning...');
         
         // 1. Create and Add Document
         const newDoc: ProjectDocument = {
            id: `D${Date.now()}`,
            name: fileToUpload.name,
            type: fileToUpload.name.split('.').pop()?.toUpperCase() || 'PDF',
            category: 'CONTRACT',
            module: 'MASTER',
            uploadDate: new Date().toISOString().split('T')[0],
            size: `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`,
            url: URL.createObjectURL(fileToUpload),
            isAnalyzed: true
         };
         
         onAddDocument(newDoc);
         docName = newDoc.name;
         
         // Artificial delay for UX
         await new Promise(resolve => setTimeout(resolve, 1500));
         
      } else {
         const file = data.documents.find(d => d.id === selectedFileId);
         if (!file) return;
         docName = file.name;
         setImportStatus('Analyzing existing document...');
      }

      // 2. Parse Items via AI Service
      const items = await parseBOQDocument(docName);
      
      setImportStatus(`Found ${items.length} BOQ items. Syncing...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Import Items
      onImportBOQItems(items);
      
      resetImport();
    } catch (e) {
      setImportStatus('Failed to parse document.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setIsImportModalOpen(false);
    setSelectedFileId('');
    setFileToUpload(null);
    setImportTab('EXISTING');
    setImportStatus(null);
  };

  const resetForm = () => {
    setDescription('');
    setRate('');
    setPlannedUnitCost('');
    setPlannedQty('');
    setPlannedMat('0');
    setPlannedLab('0');
    setPlannedEqp('0');
    setPlannedOH('0');
    setItemPriority('MEDIUM');
    setAiAppliedFields(false);
  };

  const handleSuggestCost = async () => {
    if (!description) return;
    setIsSuggesting(true);
    const suggestion = await suggestPlannedUnitCost(description, unit, data.boq);
    setIsSuggesting(false);
    
    if (suggestion) {
      setPlannedMat(suggestion.breakdown.material.toString());
      setPlannedLab(suggestion.breakdown.labor.toString());
      setPlannedEqp(suggestion.breakdown.equipment.toString());
      setPlannedOH(suggestion.breakdown.overhead.toString());
      setAiAppliedFields(true);
      
      // Reset highlight after 3 seconds
      setTimeout(() => setAiAppliedFields(false), 3000);
    }
  };

  const startEditing = (item: BOQItem) => {
    setEditId(item.id);
    setEditMat(item.plannedBreakdown?.material?.toString() || '0');
    setEditLab(item.plannedBreakdown?.labor?.toString() || '0');
    setEditEqp(item.plannedBreakdown?.equipment?.toString() || '0');
    setEditOH(item.plannedBreakdown?.overhead?.toString() || '0');
  };

  const cancelEditing = () => {
    setEditId(null);
  };

  const saveEditing = (id: string) => {
    if (!onUpdateBOQItem) return;
    const total = Number(editMat) + Number(editLab) + Number(editEqp) + Number(editOH);
    onUpdateBOQItem(id, {
      plannedUnitCost: total,
      plannedBreakdown: {
        material: Number(editMat),
        labor: Number(editLab),
        equipment: Number(editEqp),
        overhead: Number(editOH)
      }
    });
    setEditId(null);
  };

  const handleLinkDocument = (itemId: string, docId: string) => {
    if (onUpdateBOQItem) {
      onUpdateBOQItem(itemId, { linkedDocId: docId || undefined });
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
      if (editId === id) setEditId(null);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setUnitFilter('ALL');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
  };

  const hasActiveFilters = searchTerm !== '' || unitFilter !== 'ALL' || statusFilter !== 'ALL' || priorityFilter !== 'ALL';

  const getPriorityWeight = (p?: Priority) => {
    if (p === 'HIGH') return 3;
    if (p === 'MEDIUM') return 2;
    if (p === 'LOW') return 1;
    return 0;
  };

  const filteredAndSortedBOQ = useMemo(() => {
    return data.boq
      .filter(item => {
        const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUnit = unitFilter === 'ALL' || item.unit === unitFilter;
        const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;
        
        let currentStatus: StatusFilter = 'PENDING';
        if (item.executedQty >= item.plannedQty) currentStatus = 'COMPLETED';
        else if (item.executedQty > 0) currentStatus = 'IN_PROGRESS';
        
        const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
        
        return matchesSearch && matchesUnit && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        let valA: any, valB: any;
        
        const getVariance = (item: BOQItem) => {
          if (item.executedQty === 0 || !item.costAnalysis) return 0;
          return item.plannedUnitCost - item.costAnalysis.unitCost;
        };

        const getProfit = (item: BOQItem) => {
          if (item.executedQty === 0) return 0;
          const cost = item.costAnalysis?.unitCost || item.plannedUnitCost;
          return (item.rate - cost) * item.executedQty;
        };
        
        switch (sortField) {
          case 'rate': valA = a.rate; valB = b.rate; break;
          case 'plannedUnitCost': valA = a.plannedUnitCost; valB = b.plannedUnitCost; break;
          case 'plannedQty': valA = a.plannedQty; valB = b.plannedQty; break;
          case 'executedQty': valA = a.executedQty; valB = b.executedQty; break;
          case 'variance': valA = getVariance(a); valB = getVariance(b); break;
          case 'profit': valA = getProfit(a); valB = getProfit(b); break;
          case 'priority': valA = getPriorityWeight(a.priority); valB = getPriorityWeight(b.priority); break;
          case 'progress': 
            valA = (a.executedQty / a.plannedQty) || 0; 
            valB = (b.executedQty / b.plannedQty) || 0; 
            break;
          case 'revenue': valA = a.rate * a.plannedQty; valB = b.rate * b.plannedQty; break;
          default: valA = a.id; valB = b.id;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data.boq, searchTerm, unitFilter, statusFilter, priorityFilter, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 inline opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 ml-1 inline text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 ml-1 inline text-blue-600" />;
  };

  const getPriorityColor = (p?: Priority) => {
    switch(p) {
      case 'HIGH': return 'bg-red-50 text-red-600 border-red-100';
      case 'MEDIUM': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'LOW': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Master Control (Baseline)</h1>
          <p className="text-slate-500">Fixed Contract Data, BOQ & Budget</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Project Name</h4>
          <p className="text-lg font-medium text-slate-900 mt-1">{data.name}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contract Duration</h4>
          <p className="text-lg font-medium text-slate-900 mt-1">{data.startDate} to {data.endDate}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Contract Value</h4>
          <p className="text-lg font-medium text-slate-900 mt-1">৳{data.contractValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
             <h3 className="font-semibold text-slate-800">Bill of Quantities (BOQ)</h3>
             <span className="text-xs font-medium bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">Rev 1.0</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <div className="relative flex-1 min-w-[150px] xl:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as any)}
                className="text-xs font-medium text-slate-600 outline-none bg-transparent"
              >
                <option value="ALL">All Units</option>
                {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="text-xs font-medium text-slate-600 outline-none bg-transparent"
              >
                <option value="ALL">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}

            <div className="h-6 w-px bg-slate-300 mx-1 hidden xl:block"></div>

            {canEditBOQ && (
              <>
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm text-sm font-medium"
                >
                  <UploadCloud className="w-4 h-4" />
                  Sync BOQ File
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Item
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-8"></th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('id')}>
                  ID <SortIcon field="id" />
                </th>
                <th className="px-6 py-4">Description & Status</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('priority')}>
                  Priority <SortIcon field="priority" />
                </th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('rate')}>
                  Rate (৳) <SortIcon field="rate" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('variance')}>
                  Cost Var. <SortIcon field="variance" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('profit')}>
                  Profit Cont. <SortIcon field="profit" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('plannedQty')}>
                  Planned <SortIcon field="plannedQty" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('executedQty')}>
                  Executed <SortIcon field="executedQty" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('progress')}>
                  Progress <SortIcon field="progress" />
                </th>
                <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => handleSort('revenue')}>
                  Total Rev (৳) <SortIcon field="revenue" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedBOQ.map((item) => {
                const progress = Math.min(100, (item.executedQty / item.plannedQty) * 100) || 0;
                const isCompleted = item.executedQty >= item.plannedQty;
                const isInProgress = item.executedQty > 0 && !isCompleted;
                const isExpanded = expandedRows.has(item.id);
                const isEditing = editId === item.id;

                // Finance Analysis
                const hasActualCost = item.executedQty > 0 && !!item.costAnalysis;
                const actualCost = item.costAnalysis?.unitCost || 0;
                const costVariance = hasActualCost ? (item.plannedUnitCost - actualCost) : 0;
                const margin = hasActualCost ? (item.rate - actualCost) : (item.rate - item.plannedUnitCost);
                const profitContribution = item.executedQty > 0 ? (margin * item.executedQty) : 0;
                
                const currentTotal = isEditing ? (Number(editMat) + Number(editLab) + Number(editEqp) + Number(editOH)) : item.plannedUnitCost;

                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${isExpanded ? 'bg-slate-50/80' : ''}`}
                      onClick={() => toggleRow(item.id)}
                    >
                      <td className="px-4 py-4 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{item.id}</td>
                      <td className="px-6 py-4 text-slate-700 min-w-[280px]">
                        <div className="font-medium text-slate-800 line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                          {item.description}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                           {isCompleted ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-tight">Completed</span>
                           ) : isInProgress ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-tight">In Progress</span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">Pending</span>
                           )}
                           <span className="text-[10px] text-slate-400 font-medium">Budget: ৳{item.plannedUnitCost.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getPriorityColor(item.priority)}`}>
                          <Flag className="w-2.5 h-2.5" />
                          {item.priority || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700 font-mono">
                        {item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasActualCost ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-mono text-xs font-bold ${costVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {costVariance >= 0 ? '+' : ''}{costVariance.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                         {item.executedQty > 0 ? (
                           <div className="flex flex-col items-end">
                              <span className={`font-mono text-xs font-bold ${profitContribution >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                ৳{profitContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                           </div>
                         ) : (
                           <span className="text-slate-300 font-mono text-xs">0</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 font-mono">
                        {item.plannedQty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 font-semibold font-mono">
                        {item.executedQty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex flex-col items-end gap-1">
                            <span className={`text-[11px] font-bold ${progress >= 100 ? 'text-emerald-600' : progress > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                              {progress.toFixed(1)}%
                            </span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                        {(item.rate * item.plannedQty).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr className="bg-slate-50 border-y border-slate-200" onClick={(e) => e.stopPropagation()}>
                        <td colSpan={12} className="px-6 py-6">
                           <div className="max-w-4xl bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ml-8">
                             <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <Layers className="w-4 h-4 text-indigo-500" />
                                 <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Item Details & Cost Breakdown</span>
                               </div>
                               {!isEditing && canEditBOQ && (
                                 <button 
                                   onClick={() => startEditing(item)}
                                   className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg transition-colors border border-blue-100"
                                 >
                                   Edit Components
                                 </button>
                               )}
                               {isEditing && (
                                 <div className="flex items-center gap-2">
                                   <button 
                                     onClick={cancelEditing}
                                     className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1 rounded-lg transition-colors"
                                   >
                                     Cancel
                                   </button>
                                   <button 
                                     onClick={() => saveEditing(item.id)}
                                     className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                                   >
                                     <Save className="w-3 h-3" />
                                     Save Changes
                                   </button>
                                 </div>
                               )}
                             </div>
                             
                             <div className="p-6">
                                {/* Document Link Section */}
                                <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-md border border-slate-200 text-slate-400">
                                        <LinkIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Linked Reference Document</label>
                                        <select
                                            value={item.linkedDocId || ''}
                                            onChange={(e) => handleLinkDocument(item.id, e.target.value)}
                                            disabled={!canEditBOQ}
                                            className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none border-none p-0 focus:ring-0 cursor-pointer"
                                        >
                                            <option value="">Select a document to link (Contract, Bill, Drawing)...</option>
                                            {data.documents.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.category} - {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {item.linkedDocId && (
                                        <a 
                                            href={data.documents.find(d => d.id === item.linkedDocId)?.url} 
                                            download={data.documents.find(d => d.id === item.linkedDocId)?.name}
                                            className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-full transition-colors"
                                            title="Download Linked Document"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>

                                <div className="grid grid-cols-4 gap-8 mb-8">
                                  {/* Component Inputs/Views */}
                                  {[
                                    { label: 'Material', value: item.plannedBreakdown?.material || 0, editValue: editMat, setEdit: setEditMat, color: 'bg-blue-500' },
                                    { label: 'Labor', value: item.plannedBreakdown?.labor || 0, editValue: editLab, setEdit: setEditLab, color: 'bg-amber-500' },
                                    { label: 'Equipment', value: item.plannedBreakdown?.equipment || 0, editValue: editEqp, setEdit: setEditEqp, color: 'bg-emerald-500' },
                                    { label: 'Overhead', value: item.plannedBreakdown?.overhead || 0, editValue: editOH, setEdit: setEditOH, color: 'bg-violet-500' },
                                  ].map((comp, idx) => {
                                    const percent = (isEditing ? Number(comp.editValue) : comp.value) / (currentTotal || 1) * 100 || 0;
                                    return (
                                      <div key={idx} className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{comp.label}</p>
                                          <span className="text-[10px] font-bold text-slate-400">{percent.toFixed(0)}%</span>
                                        </div>
                                        {isEditing ? (
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">৳</span>
                                            <input 
                                              type="number"
                                              value={comp.editValue}
                                              onChange={(e) => comp.setEdit(e.target.value)}
                                              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono font-bold"
                                            />
                                          </div>
                                        ) : (
                                          <p className="text-xl font-mono font-bold text-slate-800">৳{comp.value.toLocaleString()}</p>
                                        )}
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                          <div className={`h-full transition-all duration-500 ${comp.color}`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                   <div className="flex items-center gap-2">
                                     <Info className="w-4 h-4 text-blue-500" />
                                     <span className="text-sm font-semibold text-slate-600">Calculated Planned Unit Cost:</span>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      {isEditing && currentTotal !== item.plannedUnitCost && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentTotal > item.plannedUnitCost ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                          {currentTotal > item.plannedUnitCost ? 'Increased' : 'Decreased'} by ৳{Math.abs(currentTotal - item.plannedUnitCost).toLocaleString()}
                                        </span>
                                      )}
                                      <span className="text-2xl font-mono font-black text-indigo-700">
                                        ৳{currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                   </div>
                                </div>
                             </div>
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

       {/* Import BOQ Modal */}
       {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50/50">
               <div className="flex items-center gap-2 text-indigo-800">
                 <UploadCloud className="w-5 h-5" />
                 <h3 className="font-bold">Sync BOQ from File</h3>
               </div>
               <button onClick={resetImport} className="text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             {/* Tabs */}
             <div className="flex border-b border-slate-200">
                <button 
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${importTab === 'EXISTING' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setImportTab('EXISTING')}
                >
                  Select Existing
                </button>
                <button 
                  className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${importTab === 'UPLOAD' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setImportTab('UPLOAD')}
                >
                  Upload New
                </button>
             </div>

             <div className="p-6 space-y-4">
               <p className="text-sm text-slate-600">
                 AI will extract items, quantities, and rates from the document to populate the master schedule.
               </p>
               
               {importTab === 'EXISTING' ? (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-2">Select Document</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={selectedFileId}
                        onChange={(e) => setSelectedFileId(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="">-- Choose File --</option>
                        {availableDocs.map(f => (
                          <option key={f.id} value={f.id}>{f.name} ({f.category})</option>
                        ))}
                      </select>
                    </div>
                    {availableDocs.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No uploaded files found.</p>
                    )}
                 </div>
               ) : (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight mb-2">Upload File</label>
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative group ${fileToUpload ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                      <input 
                        type="file" 
                        onChange={handleFileChange} 
                        accept=".pdf,.xlsx,.csv,.doc,.docx"
                        disabled={isImporting} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-3 rounded-full ${fileToUpload ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                          {fileToUpload ? <FileUp className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                        </div>
                        <p className="text-sm font-medium text-slate-700 max-w-[200px] truncate">
                          {fileToUpload ? fileToUpload.name : "Click to browse or drag file"}
                        </p>
                        {!fileToUpload && <p className="text-xs text-slate-400">PDF, Excel, or Word</p>}
                      </div>
                    </div>
                 </div>
               )}

               {importStatus && (
                 <div className="p-3 bg-indigo-50 text-indigo-700 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                   {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                   {importStatus}
                 </div>
               )}

               <div className="pt-2 flex justify-end gap-2">
                 <button 
                   onClick={resetImport}
                   className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleImport}
                   disabled={(importTab === 'EXISTING' && !selectedFileId) || (importTab === 'UPLOAD' && !fileToUpload) || isImporting}
                   className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 shadow-md flex items-center gap-2"
                 >
                   {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                   {isImporting ? 'Processing...' : 'Sync & Parse'}
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">Add New BOQ Item</h3>
                {isSuggesting && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded animate-pulse">
                    <Sparkles className="w-2.5 h-2.5" />
                    AI Estimating...
                  </div>
                )}
              </div>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Item Description</label>
                <textarea 
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                  placeholder="e.g., Earth work in cutting and filling of eroded bank"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select 
                    value={itemPriority}
                    onChange={(e) => setItemPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Selling Rate (৳)</label>
                   <input 
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Planned Quantity</label>
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={plannedQty}
                  onChange={(e) => setPlannedQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                  placeholder="0.00"
                />
              </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-slate-500 uppercase">Internal Budget Components</h4>
                      {aiAppliedFields && (
                        <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                           <CheckCircle2 className="w-3 h-3" /> Populated by AI
                        </span>
                      )}
                    </div>
                    {description && (
                       <button 
                         type="button"
                         onClick={handleSuggestCost}
                         disabled={isSuggesting}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                       >
                         {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         AI Suggest Cost
                       </button>
                    )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase">Material</label>
                      <input 
                        type="number" 
                        value={plannedMat} 
                        onChange={(e) => { setPlannedMat(e.target.value); setAiAppliedFields(false); }} 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all ${aiAppliedFields ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 bg-white'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase">Labor</label>
                      <input 
                        type="number" 
                        value={plannedLab} 
                        onChange={(e) => { setPlannedLab(e.target.value); setAiAppliedFields(false); }} 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all ${aiAppliedFields ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 bg-white'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase">Equipment</label>
                      <input 
                        type="number" 
                        value={plannedEqp} 
                        onChange={(e) => { setPlannedEqp(e.target.value); setAiAppliedFields(false); }} 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all ${aiAppliedFields ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 bg-white'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1 uppercase">Overhead</label>
                      <input 
                        type="number" 
                        value={plannedOH} 
                        onChange={(e) => { setPlannedOH(e.target.value); setAiAppliedFields(false); }} 
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all ${aiAppliedFields ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-300 bg-white'}`}
                      />
                    </div>
                 </div>

                 <div className="pt-2 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                       <span className="text-sm font-bold text-slate-700">Planned Unit Cost:</span>
                       <span className="text-xl font-mono font-black text-indigo-700">৳{Number(plannedUnitCost).toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md active:scale-95"
                >
                  Create BOQ Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterControl;
