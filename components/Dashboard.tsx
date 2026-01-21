
import React, { useState, useMemo } from 'react';
import { ProjectState, Priority, AiSuggestion, BOQItem, DPR } from '../types';
import { 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  Wallet,
  Sparkles,
  Flag,
  Zap,
  Check,
  Trash2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Calendar,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateProjectInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  data: ProjectState;
  onApplySuggestion: (suggestionId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

// Helper for Gantt Chart
const getDaysDiff = (d1: string, d2: string) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.max(1, (date2.getTime() - date1.getTime()) / (1000 * 3600 * 24));
};

const ProjectGantt: React.FC<{ data: ProjectState }> = ({ data }) => {
  const projectStart = new Date(data.startDate);
  const projectEnd = new Date(data.endDate);
  const totalDuration = getDaysDiff(data.startDate, data.endDate);

  const getPositionPercent = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = (date.getTime() - projectStart.getTime()) / (1000 * 3600 * 24);
    return Math.max(0, Math.min(100, (diff / totalDuration) * 100));
  };

  // Derive Item Execution Windows from DPRs
  const itemTimelines = useMemo(() => {
    const timelines: { itemId: string; name: string; start: string; end: string; progress: number; priority: Priority }[] = [];
    
    // Only look at items that have started or are high priority
    const activeItems = data.boq.filter(b => b.executedQty > 0 || b.priority === 'HIGH');

    activeItems.forEach(item => {
      const itemDprs = data.dprs.filter(d => d.linkedBoqId === item.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let startDate = itemDprs.length > 0 ? itemDprs[0].date : new Date().toISOString().split('T')[0]; // Default to today if no DPR but high priority
      let endDate = itemDprs.length > 0 ? itemDprs[itemDprs.length - 1].date : startDate;

      // If only one DPR or duration is 0, give it a visual width (e.g. 5 days)
      if (startDate === endDate) {
         const end = new Date(startDate);
         end.setDate(end.getDate() + 15); // Simulated visual width
         endDate = end.toISOString().split('T')[0];
      }

      // If item hasn't started (no DPRs) but is High Priority, visualize it as "Planned" starting now (simulation)
      if (itemDprs.length === 0) {
         startDate = new Date().toISOString().split('T')[0];
         const end = new Date(startDate);
         end.setDate(end.getDate() + 30);
         endDate = end.toISOString().split('T')[0];
      }

      const progress = Math.min(100, (item.executedQty / item.plannedQty) * 100);

      timelines.push({
        itemId: item.id,
        name: item.description,
        start: startDate,
        end: endDate,
        progress,
        priority: item.priority || 'LOW'
      });
    });

    return timelines.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 8); // Top 8 items
  }, [data.boq, data.dprs]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <BarChart3 className="w-5 h-5 text-indigo-600" />
           <h3 className="font-semibold text-slate-800">Project Timeline & Progress Gantt</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
           <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Active</div>
           <div className="flex items-center gap-1"><div className="w-3 h-3 rounded rotate-45 bg-emerald-500"></div> Milestone</div>
        </div>
      </div>
      
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[700px] relative">
           {/* Timeline Header (Months) */}
           <div className="flex border-b border-slate-200 pb-2 mb-4 text-xs text-slate-400 font-medium font-mono uppercase tracking-widest">
              <span className="absolute left-0">{data.startDate}</span>
              <span className="w-full text-center">Project Duration ({Math.ceil(totalDuration)} Days)</span>
              <span className="absolute right-0">{data.endDate}</span>
           </div>

           {/* Grid Lines */}
           <div className="absolute inset-0 top-8 pointer-events-none flex justify-between px-[1px]">
              {[0, 25, 50, 75, 100].map(p => (
                <div key={p} className="h-full w-px bg-slate-100 last:bg-transparent" style={{ left: `${p}%` }}></div>
              ))}
           </div>

           {/* Milestones Track */}
           <div className="h-10 relative mb-4">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 rounded-full"></div>
              {data.milestones.map(m => {
                const pos = getPositionPercent(m.date);
                const isPast = new Date(m.date) < new Date();
                return (
                  <div 
                    key={m.id} 
                    className="absolute top-1/2 -translate-y-1/2 group z-10 cursor-pointer" 
                    style={{ left: `${pos}%` }}
                  >
                    <div className={`w-3 h-3 rotate-45 border-2 border-white shadow-sm transition-transform hover:scale-125 ${
                      m.status === 'COMPLETED' ? 'bg-emerald-500' : 
                      m.status === 'AT_RISK' ? 'bg-red-500' : 'bg-slate-400'
                    }`}></div>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-20">
                      {m.title} ({m.date})
                    </div>
                  </div>
                );
              })}
           </div>

           {/* Items Tracks */}
           <div className="space-y-3">
              {itemTimelines.map(item => {
                const left = getPositionPercent(item.start);
                const width = Math.max(2, getPositionPercent(item.end) - left); // Min width 2%
                
                return (
                  <div key={item.itemId} className="relative h-10 group">
                     <div className="flex justify-between items-center text-xs mb-1 px-1">
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{item.name}</span>
                        <span className="text-slate-400">{item.progress.toFixed(0)}%</span>
                     </div>
                     <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                        <div 
                          className={`absolute h-full rounded-full transition-all duration-500 shadow-sm ${
                            item.priority === 'HIGH' ? 'bg-indigo-500' : 'bg-blue-400'
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                           {/* Inner Progress within the execution window - simplistic view */}
                           <div className="h-full bg-white/30" style={{ width: `${item.progress}%` }}></div>
                        </div>
                     </div>
                     {/* Tooltip */}
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-lg text-slate-600 text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none z-20">
                        {item.start} → {item.end}
                     </div>
                  </div>
                );
              })}
              {itemTimelines.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  No active work timelines generated yet. Add DPRs to see chart.
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ data, onApplySuggestion, onDismissSuggestion }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Calculate high-level metrics
  const totalPlannedValue = data.boq.reduce((sum, item) => sum + (item.plannedQty * item.rate), 0);
  const totalExecutedValue = data.boq.reduce((sum, item) => sum + (item.executedQty * item.rate), 0);
  const progressPercentage = Math.round((totalExecutedValue / totalPlannedValue) * 100) || 0;
  
  const totalLiabilities = data.liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalBilled = data.bills.filter(b => b.type === 'CLIENT_RA').reduce((sum, b) => sum + b.amount, 0);

  // Calculate Pending Work for Key Points
  const pendingHighPriorityItems = data.boq
    .filter(item => item.priority === 'HIGH' && item.executedQty < item.plannedQty)
    .map(item => ({
      ...item,
      pendingQty: item.plannedQty - item.executedQty,
      pendingValue: (item.plannedQty - item.executedQty) * item.rate,
      progress: (item.executedQty / item.plannedQty) * 100
    }))
    .sort((a, b) => b.pendingValue - a.pendingValue) // Sort by highest pending value
    .slice(0, 5); // Top 5

  const chartData = [
    { name: 'Planned', amount: totalPlannedValue },
    { name: 'Executed', amount: totalExecutedValue },
    { name: 'Billed', amount: totalBilled },
    { name: 'Liabilities', amount: totalLiabilities },
  ];

  const handleGenerateInsights = async () => {
    setLoadingInsight(true);
    const result = await generateProjectInsights(data);
    setInsight(result);
    setLoadingInsight(false);
  };

  const getPriorityColor = (p: Priority) => {
    switch(p) {
      case 'HIGH': return 'bg-red-50 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const pendingSuggestions = data.aiSuggestions.filter(s => s.status === 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Project Overview</h1>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1 ${getPriorityColor(data.priority)}`}>
              <Flag className="w-2.5 h-2.5" />
              {data.priority} Priority
            </div>
          </div>
          <p className="text-slate-500">Welcome back to {data.name}</p>
        </div>
        <button 
          onClick={handleGenerateInsights}
          disabled={loadingInsight}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-70"
        >
          <Sparkles className="w-4 h-4" />
          {loadingInsight ? 'Analyzing Progress Pending...' : 'Ask AI Analyst'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">{progressPercentage}%</h3>
                    </div>
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Activity className="w-5 h-5" />
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Value</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">৳{(data.contractValue / 1000000).toFixed(2)}M</h3>
                    </div>
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">Fixed Baseline</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Billed</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">৳{totalBilled.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                    <Wallet className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">Invoiced to Client</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Liabilities</p>
                    <h3 className="text-2xl font-bold text-orange-600 mt-1">৳{totalLiabilities.toLocaleString()}</h3>
                    </div>
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">Pending + Retention</p>
                </div>
            </div>

            {/* Gantt Chart Section */}
            <ProjectGantt data={data} />

            {/* KEY POINTS: Pending Progress Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-2">
                     <AlertTriangle className="w-5 h-5 text-orange-500" />
                     <h3 className="font-bold text-slate-800">Critical Pending Work (High Priority)</h3>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">Action Required</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                     <tr>
                       <th className="px-6 py-3">BOQ Item</th>
                       <th className="px-6 py-3 text-right">Pending Qty</th>
                       <th className="px-6 py-3 text-right">Pending Value</th>
                       <th className="px-6 py-3">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {pendingHighPriorityItems.length > 0 ? pendingHighPriorityItems.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 group">
                         <td className="px-6 py-3">
                           <div className="font-medium text-slate-800 line-clamp-1">{item.description}</div>
                           <div className="text-xs text-slate-400">{item.id}</div>
                         </td>
                         <td className="px-6 py-3 text-right text-slate-600 font-mono">
                           {item.pendingQty.toLocaleString()} <span className="text-[10px] text-slate-400">{item.unit}</span>
                         </td>
                         <td className="px-6 py-3 text-right font-bold text-orange-600 font-mono">
                           ৳{item.pendingValue.toLocaleString()}
                         </td>
                         <td className="px-6 py-3">
                           <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                               <div className="h-full bg-blue-500" style={{ width: `${item.progress}%` }}></div>
                             </div>
                             <span className="text-xs text-slate-500">{item.progress.toFixed(0)}%</span>
                           </div>
                         </td>
                       </tr>
                     )) : (
                       <tr>
                         <td colSpan={4} className="p-8 text-center text-slate-400">
                           <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                           No high-priority pending items found. Good job!
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>

            {/* Financial Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Financial Snapshot</h3>
                <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `৳${value/1000}k`} />
                    <Tooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `৳${value.toLocaleString()}`}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={50}>
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f97316'][index]} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>

            {insight && (
                <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm relative overflow-hidden animate-in slide-in-from-bottom-5">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI Insight Report
                </h3>
                <div className="prose prose-indigo max-w-none text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                    <ReactMarkdown>{insight}</ReactMarkdown>
                </div>
                </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
            
            {/* NEW KEY POINTS: Milestone Tracker */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                     <Flag className="w-5 h-5 text-indigo-500" />
                     <h3 className="font-bold text-slate-800">Key Project Points</h3>
                  </div>
               </div>
               <div className="p-4 space-y-4">
                  {data.milestones && data.milestones.length > 0 ? data.milestones.map((milestone) => (
                    <div key={milestone.id} className="relative pl-4 border-l-2 border-slate-200 last:mb-0">
                       <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                         milestone.status === 'COMPLETED' ? 'bg-emerald-500' :
                         milestone.status === 'AT_RISK' ? 'bg-red-500' : 'bg-slate-300'
                       }`}></div>
                       <div className="flex justify-between items-start">
                          <h4 className={`text-sm font-semibold ${milestone.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {milestone.title}
                          </h4>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            milestone.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                            milestone.status === 'AT_RISK' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                          }`}>{milestone.status.replace('_', ' ')}</span>
                       </div>
                       <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>{milestone.date}</span>
                       </div>
                       {milestone.description && <p className="text-xs text-slate-400 mt-1">{milestone.description}</p>}
                    </div>
                  )) : (
                    <div className="text-center py-4 text-slate-400 text-sm">No milestones tracked.</div>
                  )}
               </div>
            </div>

            {/* AI Action Sidebar */}
            <div className="bg-slate-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-indigo-400 fill-current" />
                        <h3 className="font-bold text-lg">AI Action Feed</h3>
                    </div>
                    <p className="text-slate-400 text-sm mb-6">Actionable data extracted from your recent document scans.</p>
                    
                    <div className="space-y-4">
                        {pendingSuggestions.length > 0 ? pendingSuggestions.map((s) => (
                            <div key={s.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-indigo-500 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                                        s.type === 'QUANTITY_UPDATE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                        s.type === 'BILL_DETECTION' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}>
                                        {s.type.replace('_', ' ')}
                                    </span>
                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{s.title}</h4>
                                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{s.description}</p>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onApplySuggestion(s.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-colors"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        Apply
                                    </button>
                                    <button 
                                        onClick={() => onDismissSuggestion(s.id)}
                                        className="p-1.5 bg-slate-700 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3 opacity-30" />
                                <p className="text-slate-500 text-sm">No pending actions. Try an AI Deep Scan on your documents.</p>
                            </div>
                        )}
                    </div>
                    
                    {pendingSuggestions.length > 0 && (
                        <button className="w-full mt-6 text-xs text-indigo-400 font-bold flex items-center justify-center gap-1 hover:text-indigo-300 transition-colors">
                            View All Suggestions
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
