
import React from 'react';
import { ProjectState, ProjectDocument, UserRole } from '../types';
import { AlertTriangle, Clock, Lock } from 'lucide-react';
import DocumentManager from './DocumentManager';

interface LiabilityTrackerProps {
  data: ProjectState;
  onAddDocument: (doc: ProjectDocument) => void;
  userRole: UserRole;
}

const LiabilityTracker: React.FC<LiabilityTrackerProps> = ({ data, onAddDocument, userRole }) => {
  const retentionTotal = data.liabilities.filter(l => l.type === 'RETENTION').reduce((s, l) => s + l.amount, 0);
  const poTotal = data.liabilities.filter(l => l.type === 'PENDING_PO').reduce((s, l) => s + l.amount, 0);
  const unbilledTotal = data.liabilities.filter(l => l.type === 'UNBILLED_WORK').reduce((s, l) => s + l.amount, 0);

  const canEdit = userRole === 'DIRECTOR' || userRole === 'ACCOUNTANT';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Liability Tracker</h1>
          <p className="text-slate-500">Monitor Future Obligations & Risks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border-l-4 border-indigo-500 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800">Retention Money</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">৳{retentionTotal.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Held by client, due after defect liability period.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border-l-4 border-orange-500 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800">Pending POs</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">৳{poTotal.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Committed costs for materials ordered but not billed.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border-l-4 border-red-500 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-800">Unbilled Liabilities</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">৳{unbilledTotal.toLocaleString()}</p>
          <p className="text-sm text-slate-500 mt-1">Work done by subcontractors, not yet invoiced.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Detailed Liability Ledger</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.liabilities.map(liability => (
              <tr key={liability.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-700">{liability.id}</td>
                <td className="px-6 py-3 text-slate-600">{liability.description}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${liability.type === 'RETENTION' ? 'bg-indigo-100 text-indigo-800' : 
                      liability.type === 'PENDING_PO' ? 'bg-orange-100 text-orange-800' : 
                      'bg-red-100 text-red-800'}`}>
                    {liability.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-500">{liability.dueDate}</td>
                <td className="px-6 py-3 text-right font-medium text-slate-900">৳{liability.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentManager 
        documents={data.documents} 
        onAddDocument={onAddDocument} 
        filterModule="LIABILITY" 
        compact={true} 
        allowUpload={canEdit}
      />
    </div>
  );
};

export default LiabilityTracker;
