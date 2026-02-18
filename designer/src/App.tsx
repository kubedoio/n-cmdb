import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Settings,
  Database,
  Share2,
  Layout,
  Activity,
  CheckCircle2,
  Plus,
  ChevronRight,
  Search,
  FileCode,
  X
} from 'lucide-react';
import CITypeEditor from './components/CITypeEditor';
import TemplateEditor from './components/TemplateEditor';
import PRSuccess from './components/PRSuccess';
import DiscoveryInbox from '../../discovery/ui/src/DiscoveryInbox';

const API_BASE = 'http://localhost:3001/api';

interface Tenant {
  id: string;
  metadata?: {
    name?: string;
  };
}

interface Resource {
  name: string;
  kind: string;
  spec?: {
    description?: string;
    [key: string]: any;
  };
}

interface Resources {
  citypes: Resource[];
  relationtypes: Resource[];
  templates: Resource[];
  [key: string]: Resource[];
}

const App = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [resources, setResources] = useState<Resources>({ citypes: [], relationtypes: [], templates: [] });
  const [activeTab, setActiveTab] = useState('citypes');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'editor'
  const [selectedObject, setSelectedObject] = useState<Resource | null>(null);
  const [prResult, setPrResult] = useState(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchResources(selectedTenant.id);
    }
  }, [selectedTenant, view]);

  const fetchTenants = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tenants`);
      setTenants(res.data);
      if (res.data.length > 0 && !selectedTenant) setSelectedTenant(res.data[0]);
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    }
  };

  const fetchResources = async (tenantId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tenants/${tenantId}/resources`);
      setResources(res.data);
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (data: any) => {
    setPrResult(data);
    setView('list');
    setSelectedObject(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans dark overflow-hidden text-sm">
      {prResult && <PRSuccess data={prResult} onDismiss={() => setPrResult(null)} />}

      {/* Global Top Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Database className="text-primary-foreground" size={18} />
            </div>
            <span className="font-bold tracking-tight text-lg">CMDB Designer</span>
          </div>

          <div className="h-6 w-[1px] bg-border mx-2" />

          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Tenant</label>
              <select
                className="bg-transparent font-medium outline-none cursor-pointer hover:text-primary transition-colors text-sm"
                value={selectedTenant?.id || ''}
                onChange={(e) => setSelectedTenant(tenants.find(t => t.id === e.target.value) || null)}
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id} className="bg-background">{t.metadata?.name || t.id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/50 rounded-full border border-border">
            <Activity size={14} className="text-emerald-500" />
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-tight">Repo @ main</span>
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center border border-border overflow-hidden">
            <Users size={16} className="text-muted-foreground" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Nav (Kinds) */}
        <aside className="w-16 border-r border-border flex flex-col items-center py-4 bg-card/20 z-20">
          {[
            { id: 'citypes', label: 'CI Types', icon: Layout },
            { id: 'relationtypes', label: 'Relations', icon: Share2 },
            { id: 'templates', label: 'Templates', icon: FileCode },
            { id: 'discovery', label: 'Discovery', icon: Activity },
            { id: 'monitoring', label: 'Monitor', icon: Settings },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setView('list'); setSelectedObject(null); }}
              title={item.label}
              className={`w-10 h-10 flex items-center justify-center rounded-xl mb-4 transition-all ${activeTab === item.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
            >
              <item.icon size={20} />
            </button>
          ))}
          <div className="mt-auto pt-4 border-t border-border w-10 flex flex-col items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground">
              <Settings size={20} />
            </button>
          </div>
        </aside>

        {/* Pane A: Object List */}
        <div className="w-72 border-r border-border bg-card/10 flex flex-col z-10">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                {activeTab.replace('types', ' Types')}
              </h2>
              <button
                onClick={() => { setView('editor'); setSelectedObject(null); }}
                className="p-1 hover:bg-primary/20 text-primary rounded-md transition-colors"
                title="New Object"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
              <input
                placeholder="Search..."
                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30 shadow-inner"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : resources[activeTab]?.length > 0 ? (
              resources[activeTab].map(resource => (
                <button
                  key={resource.name}
                  onClick={() => { setSelectedObject(resource); setView('editor'); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${selectedObject?.name === resource.name
                    ? 'bg-primary/10 border-l-2 border-primary shadow-sm'
                    : 'hover:bg-accent/50 border-l-2 border-transparent'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-semibold text-xs ${selectedObject?.name === resource.name ? 'text-primary' : ''}`}>
                      {resource.name}
                    </span>
                    <ChevronRight size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedObject?.name === resource.name ? 'text-primary opacity-100' : 'text-muted-foreground'}`} />
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {resource.spec?.description || 'No description'}
                  </p>
                </button>
              ))
            ) : (
              <div className="text-center py-12 px-4 italic text-muted-foreground text-[11px]">
                No {activeTab} found
              </div>
            )}
          </div>
        </div>

        {/* Pane B: Editor */}
        <main className="flex-1 bg-background flex flex-col min-w-0">
          {view === 'editor' || selectedObject ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <header className="h-12 border-b border-border flex items-center justify-between px-6 bg-card/5">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-tight">
                  <span className="text-muted-foreground">{selectedTenant?.metadata?.name}</span>
                  <ChevronRight size={12} className="text-muted-foreground/50" />
                  <span className="text-muted-foreground">{activeTab}</span>
                  <ChevronRight size={12} className="text-muted-foreground/50" />
                  <span className="text-foreground">{selectedObject?.name || 'New Object'}</span>
                  {/* Draft Indicator */}
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[9px]">Draft</span>
                </div>
                <button
                  onClick={() => { setView('list'); setSelectedObject(null); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="flex-1 overflow-hidden">
                {activeTab === 'citypes' ? (
                  <CITypeEditor
                    tenant={selectedTenant}
                    initialData={selectedObject}
                    onSave={handleSave}
                    onCancel={() => { setView('list'); setSelectedObject(null); }}
                  />
                ) : activeTab === 'templates' ? (
                  <TemplateEditor
                    tenant={selectedTenant}
                    ciTypes={resources.citypes}
                    initialData={selectedObject}
                    onSave={handleSave}
                    onCancel={() => { setView('list'); setSelectedObject(null); }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground italic">
                    {activeTab} Editor coming soon...
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'discovery' ? (
            <DiscoveryInbox />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-card/5 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-6 border border-border/50 shadow-xl">
                <Database className="text-muted-foreground" size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">Select an object to edit</h2>
              <p className="max-w-xs text-muted-foreground text-sm">
                Choose a {activeTab.slice(0, -1)} from the list on the left or create a new one to start designing.
              </p>
              <button
                onClick={() => setView('editor')}
                className="mt-8 flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                <span>Create New {activeTab.slice(0, -1)}</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
