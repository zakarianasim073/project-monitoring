import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import ProjectList from './components/ProjectList';
import Dashboard from './components/Dashboard';
import MasterControl from './components/MasterControl';
import SiteExecution from './components/SiteExecution';
import FinancialControl from './components/FinancialControl';
import LiabilityTracker from './components/LiabilityTracker';
import DocumentManager from './components/DocumentManager';
import Layout from './components/Layout';
import { ProjectState, UserRole, AiSuggestion, BOQItem, DPR, Bill, Liability, ProjectDocument } from './types';

function App() {
  const [projects, setProjects] = useState<ProjectState[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('DIRECTOR');

  // Load projects from localStorage on mount
  useEffect(() => {
    const savedProjects = localStorage.getItem('buildtrack-projects');
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    } else {
      // Initialize with a sample project
      const sampleProject: ProjectState = {
        id: '1',
        name: 'Sample Construction Project',
        contractValue: 5000000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'ACTIVE',
        priority: 'HIGH',
        boq: [],
        dprs: [],
        bills: [],
        liabilities: [],
        documents: [],
        suggestions: []
      };
      setProjects([sampleProject]);
      localStorage.setItem('buildtrack-projects', JSON.stringify([sampleProject]));
    }
  }, []);

  // Save projects to localStorage when they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('buildtrack-projects', JSON.stringify(projects));
    }
  }, [projects]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleCreateProject = (project: Partial<ProjectState>) => {
    const newProject: ProjectState = {
      ...project,
      id: Date.now().toString(),
      boq: project.boq || [],
      dprs: project.dprs || [],
      bills: project.bills || [],
      liabilities: project.liabilities || [],
      documents: project.documents || [],
      suggestions: []
    } as ProjectState;
    
    setProjects([...projects, newProject]);
    setSelectedProjectId(newProject.id);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('dashboard');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
  };

  const updateProject = (updater: (project: ProjectState) => ProjectState) => {
    if (!selectedProject) return;
    setProjects(projects.map(p => p.id === selectedProject.id ? updater(p) : p));
  };

  const handleApplySuggestion = (suggestionId: string) => {
    updateProject(project => ({
      ...project,
      suggestions: project.suggestions?.filter(s => s.id !== suggestionId)
    }));
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    updateProject(project => ({
      ...project,
      suggestions: project.suggestions?.map(s => 
        s.id === suggestionId ? { ...s, dismissed: true } : s
      )
    }));
  };

  const handleUpdateBOQ = (boq: BOQItem[]) => {
    updateProject(project => ({ ...project, boq }));
  };

  const handleAddDPR = (dpr: DPR) => {
    updateProject(project => ({
      ...project,
      dprs: [...project.dprs, dpr]
    }));
  };

  const handleUpdateDPR = (dprId: string, updatedDPR: DPR) => {
    updateProject(project => ({
      ...project,
      dprs: project.dprs.map(d => d.id === dprId ? updatedDPR : d)
    }));
  };

  const handleDeleteDPR = (dprId: string) => {
    updateProject(project => ({
      ...project,
      dprs: project.dprs.filter(d => d.id !== dprId)
    }));
  };

  const handleAddBill = (bill: Bill) => {
    updateProject(project => ({
      ...project,
      bills: [...project.bills, bill]
    }));
  };

  const handleUpdateBill = (billId: string, updatedBill: Bill) => {
    updateProject(project => ({
      ...project,
      bills: project.bills.map(b => b.id === billId ? updatedBill : b)
    }));
  };

  const handleDeleteBill = (billId: string) => {
    updateProject(project => ({
      ...project,
      bills: project.bills.filter(b => b.id !== billId)
    }));
  };

  const handleAddLiability = (liability: Liability) => {
    updateProject(project => ({
      ...project,
      liabilities: [...project.liabilities, liability]
    }));
  };

  const handleUpdateLiability = (liabilityId: string, updatedLiability: Liability) => {
    updateProject(project => ({
      ...project,
      liabilities: project.liabilities.map(l => l.id === liabilityId ? updatedLiability : l)
    }));
  };

  const handleDeleteLiability = (liabilityId: string) => {
    updateProject(project => ({
      ...project,
      liabilities: project.liabilities.filter(l => l.id !== liabilityId)
    }));
  };

  const handleAddDocument = (document: ProjectDocument) => {
    updateProject(project => ({
      ...project,
      documents: [...project.documents, document]
    }));
  };

  const handleDeleteDocument = (documentId: string) => {
    updateProject(project => ({
      ...project,
      documents: project.documents.filter(d => d.id !== documentId)
    }));
  };

  if (!selectedProject) {
    return (
      <>
        <ProjectList
          projects={projects}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          userRole={userRole}
          onSwitchRole={setUserRole}
        />
        <Analytics />
      </>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            data={selectedProject}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
        );
      case 'master':
        return (
          <MasterControl
            data={selectedProject}
            onUpdateBOQ={handleUpdateBOQ}
            userRole={userRole}
          />
        );
      case 'site':
        return (
          <SiteExecution
            data={selectedProject}
            onAddDPR={handleAddDPR}
            onUpdateDPR={handleUpdateDPR}
            onDeleteDPR={handleDeleteDPR}
            userRole={userRole}
          />
        );
      case 'finance':
        return (
          <FinancialControl
            data={selectedProject}
            onAddBill={handleAddBill}
            onUpdateBill={handleUpdateBill}
            onDeleteBill={handleDeleteBill}
            userRole={userRole}
          />
        );
      case 'liability':
        return (
          <LiabilityTracker
            data={selectedProject}
            onAddLiability={handleAddLiability}
            onUpdateLiability={handleUpdateLiability}
            onDeleteLiability={handleDeleteLiability}
            userRole={userRole}
          />
        );
      case 'documents':
        return (
          <DocumentManager
            documents={selectedProject.documents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            boqItems={selectedProject.boq}
            onUpdateBOQ={handleUpdateBOQ}
            onAddBill={handleAddBill}
            userRole={userRole}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchProject={handleBackToProjects}
        projectName={selectedProject.name}
        userRole={userRole}
        onSwitchRole={setUserRole}
      >
        {renderContent()}
      </Layout>
      <Analytics />
    </>
  );
}

export default App;
