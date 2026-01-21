
import React, { useState, useEffect } from 'react';
import { ProjectDocument, DocumentCategory, ModuleType, BOQItem, ExtractedBill } from '../types';
import { 
  FileText, 
  Image, 
  File, 
  Search, 
  UploadCloud, 
  Download, 
  X,
  FileSpreadsheet,
  Paperclip,
  Loader2,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { analyzeDocumentContent, suggestDocumentMetadata, extractBillData } from '../services/geminiService';

interface DocumentManagerProps {
  documents: ProjectDocument[];
  onAddDocument: (doc: ProjectDocument) => void;
  onAnalyzeDocument?: (docId: string, suggestions: any[]) => void;
  onBillUploaded?: (data: ExtractedBill) => void;
  boqItems?: BOQItem[];
  filterModule?: ModuleType; 
  compact?: boolean; 
  allowUpload?: boolean;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ 
  documents, 
  onAddDocument, 
  onAnalyzeDocument,
  onBillUploaded,
  boqItems = [],
  filterModule,
  compact = false,
  allowUpload = true
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'ALL'>('ALL');
  const [selectedModule, setSelectedModule] = useState<ModuleType | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('PDF');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('REPORT');
  const [newDocModule, setNewDocModule] = useState<ModuleType>(filterModule || 'GENERAL');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuggestingMetadata, setIsSuggestingMetadata] = useState(false);
  const [isAnalyzingBill, setIsAnalyzingBill] = useState(false);
  const [hasAiSuggested, setHasAiSuggested] = useState(false);

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchesModule = filterModule 
      ? doc.module === filterModule 
      : (selectedModule === 'ALL' || doc.module === selectedModule);
    
    const matchesDate = (!dateFrom || doc.uploadDate >= dateFrom) && 
                        (!dateTo || doc.uploadDate <= dateTo);

    return matchesSearch && matchesCategory && matchesModule && matchesDate;
  });

  const handleDeepScan = async (doc: ProjectDocument) => {
    if (!onAnalyzeDocument) return;
    setAnalyzingDocId(doc.id);
    const suggestions = await analyzeDocumentContent(doc.name, doc.category, boqItems);
    onAnalyzeDocument(doc.id, suggestions);
    setAnalyzingDocId(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setNewDocName(file.name);
      setHasAiSuggested(false);
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setNewDocType('PDF');
      else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) setNewDocType('JPG');
      else if (['xlsx', 'xls', 'csv'].includes(ext || '')) setNewDocType('XLSX');
      else if (['dwg', 'dxf'].includes(ext || '')) setNewDocType('DWG');
      else setNewDocType('PDF');

      // AI Meta Suggestion
      setIsSuggestingMetadata(true);
      const suggestion = await suggestDocumentMetadata(file.name, "USER_ROLE"); // Pass role if available
      setIsSuggestingMetadata(false);
      
      if (suggestion) {
        if (suggestion.category) setNewDocCategory(suggestion.category as DocumentCategory);
        if (suggestion.module) setNewDocModule(suggestion.module as ModuleType);
        setHasAiSuggested(true);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    let fileSize = '0.0 MB';
    let fileUrl = undefined;

    if (selectedFile) {
      fileSize = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
      fileUrl = URL.createObjectURL(selectedFile);
    } else {
      fileSize = `${(Math.random() * 5 + 0.5).toFixed(1)} MB`;
    }

    const newDoc: ProjectDocument = {
      id: `D${Date.now()}`,
      name: newDocName,
      type: newDocType,
      category: newDocCategory,
      module: newDocModule,
      uploadDate: new Date().toISOString().split('T')[0],
      size: fileSize,
      url: fileUrl,
      isAnalyzed: false
    };

    onAddDocument(newDoc);

    // Auto-Extraction for Bills
    if (newDocCategory === 'BILL' && onBillUploaded) {
      setIsAnalyzingBill(true);
      try {
        const extracted = await extractBillData(newDocName);
        if (extracted) {
          onBillUploaded(extracted);
        }
      } catch (err) {
        console.error("Bill extraction failed", err);
      }
      setIsAnalyzingBill(false);
    }

    setIsUploading(false);
    setIsUploadModalOpen(false);
    setNewDocName('');
    setSelectedFile(null);
    setHasAiSuggested(false);
  };

  const getIcon = (type: string) => {
    if (type.includes('PDF')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('JPG') || type.includes('PNG')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type.includes('XLS')) return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    if (type.includes('DWG')) return <Paperclip className="w-5 h-5 text-slate-500" />;
    return <File className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${compact ? '' : 'h-full flex flex-col'}`}>
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-800">
            {compact ? 'Related Documents' : 'Document Management'}
          </h3>
          {!compact && <p className="text-sm text-slate-500">Central repository for all project files</p>}
        </div>
        {allowUpload && (
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document
          </button>
        )}
      </div>

      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search documents by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]"
            >
                <option value="ALL">All Categories</option>
                <option value="CONTRACT">Contracts</option>
                <option value="DRAWING">Drawings</option>
                <option value="PERMIT">Permits</option>
                <option value="REPORT">Reports</option>
                <option value="BILL">Bills</option>
            </select>
        </div>
      </div>

      <div className={`${compact ? 'max-h-[300px]' : 'flex-1'} overflow-y-auto`}>
        {filteredDocs.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 sticky top-0">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3 hidden md:table-cell">Category</th>
                <th className="px-6 py-3 text-right">Date</th>
                <th className="px-6 py-3 text-center">AI Scan</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {getIcon(doc.type)}
                      <p className="font-medium text-slate-700">{doc.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">{doc.uploadDate}</td>
                  <td className="px-6 py-3 text-center">
                    {analyzingDocId === doc.id ? (
                      <div className="flex items-center justify-center gap-1.5 text-indigo-600 font-bold text-xs animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Reading...
                      </div>
                    ) : doc.isAnalyzed ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Synced
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleDeepScan(doc)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                        AI Deep Scan
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <a href={doc.url} download={doc.name} className="text-blue-600 hover:text-blue-800 p-1">
                      <Download className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <File className="w-12 h-12 mb-3 opacity-20" />
            <p>No documents found</p>
          </div>
        )}
      </div>

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">Upload & Analyze</h3>
                {isSuggestingMetadata && !isAnalyzingBill && (
                   <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded animate-pulse">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Analyzing Name...
                   </div>
                )}
                {isAnalyzingBill && (
                   <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded animate-pulse">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      Extracting Bill Data...
                   </div>
                )}
              </div>
              <button onClick={() => !isUploading && setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select File</label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors relative group ${selectedFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                  <input type="file" onChange={handleFileChange} disabled={isUploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="flex flex-col items-center gap-2">
                    <div className={`p-3 rounded-full ${selectedFile ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {selectedFile ? <CheckCircle2 className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                    </div>
                    <p className="text-sm font-medium">{selectedFile ? selectedFile.name : "Choose file"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight">Category</label>
                    {hasAiSuggested && (
                      <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" /> AI Sug
                      </span>
                    )}
                  </div>
                  <select 
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all bg-white ${isSuggestingMetadata ? 'opacity-50 blur-[1px]' : ''} ${hasAiSuggested ? 'border-indigo-200' : 'border-slate-300'}`}
                  >
                    <option value="REPORT">Progress Report</option>
                    <option value="BILL">Invoice / Bill</option>
                    <option value="DRAWING">Technical Drawing</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="PERMIT">Permit</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                   <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-tight">Module</label>
                    {hasAiSuggested && (
                      <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" /> AI Sug
                      </span>
                    )}
                  </div>
                  <select 
                    value={newDocModule}
                    onChange={(e) => setNewDocModule(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all bg-white ${isSuggestingMetadata ? 'opacity-50 blur-[1px]' : ''} ${hasAiSuggested ? 'border-indigo-200' : 'border-slate-300'}`}
                  >
                    <option value="GENERAL">General</option>
                    <option value="SITE">Site Ops</option>
                    <option value="FINANCE">Financials</option>
                    <option value="MASTER">Master Records</option>
                    <option value="LIABILITY">Liabilities</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isUploading || isSuggestingMetadata || isAnalyzingBill} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
                  {isAnalyzingBill ? 'Extracting Data...' : (isUploading ? 'Uploading...' : 'Save Document')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;
