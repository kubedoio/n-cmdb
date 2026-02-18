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

const API_BASE = 'http://localhost:3001/api';

const App = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [resources, setResources] = useState({ citypes: [], relationtypes: [], templates: [] });
  const [activeTab, setActiveTab] = useState('citypes');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'editor'
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
      if (res.data.length > 0) setSelectedTenant(res.data[0]);
    } catch (err) {
      console.error("Failed to fetch tenants", err);
    }
  };

  const fetchResources = async (tenantId) => {
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

  const handleSave = (data) => {
    setPrResult(data);
    setView('list');
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans dark overflow-hidden text-sm">
      {prResult && <PRSuccess data={prResult} onDismiss={() => setPrResult(null)} />}

      {/* Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col bg-card/50 backdrop-blur-md z-20">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Database className="text-primary-foreground" size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">CMDB Designer</span>
        </div>

        <div className="p-4">
          <label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block tracking-wider">Tenant</label>
          <select
            className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            value={selectedTenant?.id || ''}
            onChange={(e) => setSelectedTenant(tenants.find(t => t.id === e.target.value))}
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.metadata?.name || t.id}</option>
            ))}
          </select>
        </div>

        <nav className="flex-1 overflow-y-auto mt-2">
          {[
            { id: 'citypes', label: 'CI Types', icon: Layout },
            { id: 'relationtypes', label: 'Relation Types', icon: Share2 },
            { id: 'templates', label: 'Templates', icon: FileCode },
            { id: 'monitoring', label: 'Monitoring', icon: Activity },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setView('list'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${activeTab === item.id
                ? 'bg-primary/10 text-primary border-r-2 border-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-card/10 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{selectedTenant?.metadata?.name}</span>
            <ChevronRight size={14} />
            <span className="text-foreground font-semibold capitalize">
              {activeTab.replace('types', ' Types')}
              {view === 'editor' && <span className="text-muted-foreground font-normal"> / New</span>}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {view === 'list' ? (
              <button
                onClick={() => setView('editor')}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                <span>New {activeTab.slice(0, -1)}</span>
              </button>
            ) : (
              <button
                onClick={() => setView('list')}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-8">
          {view === 'editor' ? (
            activeTab === 'citypes' ? (
              <CITypeEditor
                tenant={selectedTenant}
                onSave={handleSave}
                onCancel={() => setView('list')}
              />
            ) : activeTab === 'templates' ? (
              <TemplateEditor
                tenant={selectedTenant}
                ciTypes={resources.citypes}
                onSave={handleSave}
                onCancel={() => setView('list')}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground italic">
                {activeTab.slice(0, -1).toUpperCase()} Editor coming soon...
              </div>
            )
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6 overflow-y-auto h-full pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources[activeTab]?.map(resource => (
                  <div key={resource.name} className="p-4 border border-border rounded-xl bg-card hover:border-primary/50 transition-all cursor-pointer group hover:shadow-xl hover:shadow-primary/5 translate-y-0 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{resource.name}</h3>
                      <div className="flex gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-accent text-accent-foreground uppercase font-bold tracking-tighter">
                          {resource.kind}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                      {resource.spec?.description || 'No description provided.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground font-mono uppercase italic">
                        Last sync: Just now
                      </span>
                      <ChevronRight className="text-muted-foreground group-hover:text-primary transition-colors" size={16} />
                    </div>
                  </div>
                ))}
                {(!resources[activeTab] || resources[activeTab]?.length === 0) && (
                  <div className="col-span-full border-2 border-dashed border-border rounded-xl p-12 text-center bg-card/10">
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                      <Search className="text-muted-foreground" size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-1">No {activeTab.replace('types', ' Types')} found</h3>
                    <p className="text-muted-foreground text-sm">Get started by creating your first {activeTab.slice(0, -1)}.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
