
import React, { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MasterControl from './components/MasterControl';
import SiteExecution from './components/SiteExecution';
import FinancialControl from './components/FinancialControl';
import LiabilityTracker from './components/LiabilityTracker';
import DocumentManager from './components/DocumentManager';
import ProjectList from './components/ProjectList';
import { MOCK_PROJECTS } from './constants';
import { ProjectState, ProjectDocument, DPR, UserRole, BOQItem, AiSuggestion, Material, Bill, ExtractedDPR } from './types';
import { parseBOQDocument, analyzeDocumentContent } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<ProjectState[]>(MOCK_PROJECTS.map(p => ({ ...p, aiSuggestions: [] })));
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('DIRECTOR');

  const activeProject = projects.find(p => p.id === activeProjectId);

  const handleCreateProject = (newProject: Partial<ProjectState>) => {
    const project: ProjectState = {
      ...newProject as ProjectState,
      id: `P${Date.now()}`,
      aiSuggestions: [],
      materials: [],
      subContractors: []
    };
    setProjects([project, ...projects]);
    setActiveProjectId(project.id);
  };

  const handleUpdateProject = (projectId: string, updater: (proj: ProjectState) => ProjectState) => {
    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId) {
        return updater(p);
      }
      return p;
    }));
  };

  const handleAddDocument = async (newDoc: ProjectDocument) => {
    if (!activeProjectId || !activeProject) return;
    
    // 1. Add Document immediately
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      documents: [newDoc, ...project.documents]
    }));

    // 2. Trigger Auto-Analysis based on Doc Type
    try {
      const suggestions = await analyzeDocumentContent(newDoc.name, newDoc.category, activeProject.boq);
      
      if (suggestions && suggestions.length > 0) {
        handleUpdateProject(activeProjectId, (project) => ({
          ...project,
          documents: project.documents.map(d => d.id === newDoc.id ? { ...d, isAnalyzed: true } : d),
          aiSuggestions: [...suggestions.map(s => ({ ...s, docId: newDoc.id })), ...project.aiSuggestions]
        }));
      }
    } catch (e) {
      console.error("Auto-analysis failed", e);
    }
  };

  const handleAnalyzeDocument = (docId: string, suggestions: AiSuggestion[]) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      documents: project.documents.map(d => d.id === docId ? { ...d, isAnalyzed: true } : d),
      aiSuggestions: [...suggestions, ...project.aiSuggestions]
    }));
    setActiveTab('dashboard'); // Switch to dashboard to see results
  };

  const handleImportBOQItems = (items: BOQItem[]) => {
     if (!activeProjectId) return;
     handleUpdateProject(activeProjectId, (project) => ({
       ...project,
       boq: [...project.boq, ...items] // Append new items. In real app, this might merge or replace.
     }));
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    if (!activeProjectId || !activeProject) return;
    const suggestion = activeProject.aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.type === 'BOQ_IMPORT') {
      const relatedDoc = activeProject.documents.find(d => d.id === suggestion.docId);
      if (relatedDoc) {
         const items = await parseBOQDocument(relatedDoc.name);
         handleImportBOQItems(items);
      }
      handleUpdateProject(activeProjectId, (project) => ({
        ...project,
        aiSuggestions: project.aiSuggestions.map(s => s.id === suggestionId ? { ...s, status: 'APPLIED' as const } : s)
      }));
      return;
    }

    if (suggestion.type === 'DPR_ENTRY' && suggestion.value) {
       const dprData = suggestion.value as ExtractedDPR;
       // Resolve IDs
       let subId = undefined;
       if (dprData.subContractorName) {
         subId = activeProject.subContractors?.find(s => 
           s.name.toLowerCase().includes(dprData.subContractorName!.toLowerCase())
         )?.id;
       }

       let materialsUsed = [];
       if (dprData.materials) {
         materialsUsed = dprData.materials.map(m => {
           const mat = activeProject.materials.find(ex => ex.name.toLowerCase().includes(m.name.toLowerCase()));
           return mat ? { materialId: mat.id, qty: m.qty } : null;
         }).filter(Boolean) as any;
       }

       const newDPR: DPR = {
         id: `DPR-AI-${Date.now()}`,
         date: dprData.date || new Date().toISOString().split('T')[0],
         activity: dprData.activity || 'Reported Activity',
         location: dprData.location || 'Site',
         laborCount: dprData.laborCount || 0,
         remarks: dprData.remarks || '',
         linkedBoqId: dprData.linkedBoqId,
         workDoneQty: dprData.workDoneQty,
         subContractorId: subId,
         materialsUsed: materialsUsed
       };
       handleAddDPR(newDPR);
       
       handleUpdateProject(activeProjectId, (project) => ({
        ...project,
        aiSuggestions: project.aiSuggestions.map(s => s.id === suggestionId ? { ...s, status: 'APPLIED' as const } : s)
      }));
      return;
    }

    handleUpdateProject(activeProjectId, (project) => {
      let updatedProject = { ...project };
      
      // Update data based on suggestion type
      if (suggestion.type === 'QUANTITY_UPDATE' && suggestion.linkedId && suggestion.value) {
        updatedProject.boq = project.boq.map(b => b.id === suggestion.linkedId ? { ...b, executedQty: b.executedQty + suggestion.value } : b);
      } else if (suggestion.type === 'BILL_DETECTION' && suggestion.value) {
        const billVal = suggestion.value as any; // could be object or number
        const amount = typeof billVal === 'object' ? billVal.amount : billVal;
        
        const newBill = {
          id: `BILL-AI-${Date.now()}`,
          type: 'VENDOR_INVOICE' as const,
          entityName: suggestion.title.split('from ')[1] || 'Unknown Vendor',
          amount: Number(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'PENDING' as const
        };
        updatedProject.bills = [newBill, ...project.bills];
      }

      updatedProject.aiSuggestions = project.aiSuggestions.map(s => s.id === suggestionId ? { ...s, status: 'APPLIED' as const } : s);
      return updatedProject;
    });
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      aiSuggestions: project.aiSuggestions.map(s => s.id === suggestionId ? { ...s, status: 'DISMISSED' as const } : s)
    }));
  };

  const handleAddDPR = (newDPR: DPR) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => {
      const updatedDPRs = [newDPR, ...project.dprs];
      let updatedBOQ = project.boq;
      let updatedSubContractors = project.subContractors;
      let updatedLiabilities = project.liabilities;
      
      // 1. Update BOQ Executed Qty
      if (newDPR.linkedBoqId && newDPR.workDoneQty) {
        updatedBOQ = project.boq.map(item => {
          if (item.id === newDPR.linkedBoqId) {
            return { ...item, executedQty: item.executedQty + (newDPR.workDoneQty || 0) };
          }
          return item;
        });

        // 2. Automated Sub-contractor Progress Tracking
        if (newDPR.subContractorId && newDPR.workDoneQty) {
          const sub = project.subContractors.find(s => s.id === newDPR.subContractorId);
          if (sub) {
            // Find agreed rate for this BOQ item
            const rateInfo = sub.agreedRates.find(r => r.boqId === newDPR.linkedBoqId);
            const rate = rateInfo ? rateInfo.rate : 0;
            const workValue = newDPR.workDoneQty * rate;

            if (workValue > 0) {
              // Update SC stats
              updatedSubContractors = project.subContractors.map(s => {
                 if (s.id === sub.id) {
                   return {
                     ...s,
                     totalWorkValue: s.totalWorkValue + workValue,
                     currentLiability: s.currentLiability + workValue
                   };
                 }
                 return s;
              });

              // Create Liability Entry automatically
              const newLiability = {
                id: `L-AUTO-${Date.now()}`,
                description: `Unbilled Work: ${sub.name} (${newDPR.date})`,
                type: 'UNBILLED_WORK' as const,
                amount: workValue,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Net 30 default
              };
              updatedLiabilities = [newLiability, ...project.liabilities];
            }
          }
        }
      }

      // 3. Update Material Stock
      let updatedMaterials = project.materials;
      if (newDPR.materialsUsed && newDPR.materialsUsed.length > 0) {
        updatedMaterials = project.materials.map(mat => {
          const used = newDPR.materialsUsed?.find(u => u.materialId === mat.id);
          if (used) {
            return { 
              ...mat, 
              totalConsumed: mat.totalConsumed + used.qty,
              currentStock: mat.currentStock - used.qty
            };
          }
          return mat;
        });
      }

      return { 
        ...project, 
        dprs: updatedDPRs, 
        boq: updatedBOQ, 
        materials: updatedMaterials, 
        subContractors: updatedSubContractors,
        liabilities: updatedLiabilities
      };
    });
  };

  const handleReceiveMaterial = (materialId: string, receivedQty: number, newRate?: number) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      materials: project.materials.map(mat => {
        if (mat.id === materialId) {
          const newTotalReceived = mat.totalReceived + receivedQty;
          const newStock = mat.currentStock + receivedQty;
          // Weighted Average Rate Calculation
          const oldVal = mat.currentStock * mat.averageRate;
          const newVal = receivedQty * (newRate || mat.averageRate);
          const newAvgRate = (oldVal + newVal) / newStock;

          return {
            ...mat,
            totalReceived: newTotalReceived,
            currentStock: newStock,
            averageRate: newRate ? newAvgRate : mat.averageRate
          };
        }
        return mat;
      })
    }));
  };

  const handleAddBill = (newBill: Bill) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      bills: [newBill, ...project.bills]
    }));
  };

  const handleBillItemizedUpdate = (items: { boqId: string; amount: number }[]) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      boq: project.boq.map(b => {
        const update = items.find(i => i.boqId === b.id);
        if (update) {
          return { ...b, billedAmount: (b.billedAmount || 0) + update.amount };
        }
        return b;
      })
    }));
  };

  const handleUpdatePDRemarks = (entityType: 'MATERIAL' | 'BILL' | 'DPR' | 'SUBCONTRACTOR', entityId: string, remarks: string) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => {
      if (entityType === 'MATERIAL') {
        return { ...project, materials: project.materials.map(m => m.id === entityId ? { ...m, pdRemarks: remarks } : m) };
      }
      if (entityType === 'BILL') {
        return { ...project, bills: project.bills.map(b => b.id === entityId ? { ...b, pdRemarks: remarks } : b) };
      }
      if (entityType === 'SUBCONTRACTOR') {
        return { ...project, subContractors: project.subContractors.map(s => s.id === entityId ? { ...s, pdRemarks: remarks } : s) };
      }
      return project;
    });
  };

  const handleAddBOQItem = (newItem: BOQItem) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      boq: [...project.boq, newItem]
    }));
  };

  const handleUpdateBOQItem = (itemId: string, updatedItem: Partial<BOQItem>) => {
    if (!activeProjectId) return;
    handleUpdateProject(activeProjectId, (project) => ({
      ...project,
      boq: project.boq.map(item => item.id === itemId ? { ...item, ...updatedItem } : item)
    }));
  };

  if (!activeProject) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ProjectList 
          projects={projects} 
          onSelectProject={setActiveProjectId} 
          onCreateProject={handleCreateProject}
          userRole={userRole}
          onSwitchRole={setUserRole}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            data={activeProject} 
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
        );
      case 'master':
        return <MasterControl 
                  data={activeProject} 
                  onAddDocument={handleAddDocument} 
                  onAddBOQItem={handleAddBOQItem} 
                  onUpdateBOQItem={handleUpdateBOQItem} 
                  onImportBOQItems={handleImportBOQItems}
                  userRole={userRole} 
               />;
      case 'site':
        return <SiteExecution 
                  data={activeProject} 
                  onAddDocument={handleAddDocument} 
                  onAddDPR={handleAddDPR} 
                  onReceiveMaterial={handleReceiveMaterial}
                  onUpdatePDRemarks={handleUpdatePDRemarks}
                  userRole={userRole} 
               />;
      case 'finance':
        return <FinancialControl 
                 data={activeProject} 
                 onAddDocument={handleAddDocument} 
                 onUpdateBOQItem={handleUpdateBOQItem} 
                 onAddBill={handleAddBill}
                 onUpdatePDRemarks={handleUpdatePDRemarks}
                 onBillItemizedUpdate={handleBillItemizedUpdate}
                 userRole={userRole} 
               />;
      case 'liability':
        return <LiabilityTracker data={activeProject} onAddDocument={handleAddDocument} userRole={userRole} />;
      case 'documents':
        return (
          <div className="h-[calc(100vh-8rem)]">
            <DocumentManager 
              documents={activeProject.documents} 
              onAddDocument={handleAddDocument} 
              onAnalyzeDocument={handleAnalyzeDocument}
              boqItems={activeProject.boq}
              allowUpload={userRole === 'DIRECTOR' || userRole === 'MANAGER' || userRole === 'ENGINEER'}
            />
          </div>
        );
      default:
        return <Dashboard data={activeProject} onApplySuggestion={handleApplySuggestion} onDismissSuggestion={handleDismissSuggestion} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onSwitchProject={() => setActiveProjectId(null)}
        projectName={activeProject.name}
        userRole={userRole}
        onSwitchRole={setUserRole}
      >
        {renderContent()}
      </Layout>
      <Analytics />
    </>
  );
};

export default App;
