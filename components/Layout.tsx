
import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  HardHat, 
  DollarSign, 
  AlertTriangle,
  FolderOpen,
  Menu,
  X,
  ChevronLeft,
  UserCircle
} from 'lucide-react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSwitchProject: () => void;
  projectName: string;
  userRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  onSwitchProject, 
  projectName,
  userRole,
  onSwitchRole
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'master', label: 'Master Control', icon: FileText },
    { id: 'site', label: 'Site Execution', icon: HardHat },
    { id: 'finance', label: 'Financial Control', icon: DollarSign },
    { id: 'liability', label: 'Liability Tracker', icon: AlertTriangle },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
  ];

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case 'DIRECTOR': return 'Project Director';
      case 'MANAGER': return 'Project Manager';
      case 'ENGINEER': return 'Site Engineer';
      case 'ACCOUNTANT': return 'Accountant';
      default: return role;
    }
  };

  const renderNav = () => (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-2 text-slate-800">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-xl font-bold tracking-tight">BuildTrack</span>
        </div>
        <button 
          onClick={onSwitchProject}
          className="w-full flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors mt-2"
        >
          <ChevronLeft className="w-3 h-3" />
          Switch Project
        </button>
        <div className="mt-2 text-sm font-semibold text-slate-800 truncate" title={projectName}>
          {projectName}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="mb-2 text-xs font-semibold text-slate-400 uppercase">Active Role (Simulated)</div>
        <div className="relative group">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
            <UserCircle className="w-8 h-8 text-slate-400" />
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-700">{getRoleLabel(userRole)}</p>
              <p className="text-xs text-slate-500">Click to switch</p>
            </div>
          </button>
          
          <div className="absolute bottom-full left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl mb-2 hidden group-hover:block z-50">
            <div className="p-1">
              {(['DIRECTOR', 'MANAGER', 'ENGINEER', 'ACCOUNTANT'] as UserRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => onSwitchRole(role)}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-50 ${userRole === role ? 'font-semibold text-blue-600 bg-blue-50' : 'text-slate-600'}`}
                >
                  {getRoleLabel(role)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-20 flex items-center justify-between px-4">
        <div className="flex flex-col">
          <span className="font-bold text-lg text-slate-800">BuildTrack AI</span>
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{projectName}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 fixed h-full z-10">
        {renderNav()}
      </aside>

      {/* Sidebar Mobile */}
      {isMobileMenuOpen && (
        <aside className="lg:hidden fixed inset-0 z-30 bg-white shadow-xl">
          <div className="flex justify-end p-4">
             <button onClick={() => setIsMobileMenuOpen(false)}><X /></button>
          </div>
          {renderNav()}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 transition-all">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
