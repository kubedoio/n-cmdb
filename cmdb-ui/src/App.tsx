import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Database,
    Search,
    Plus,
    Layout,
    Share2,
    FileCode,
    Activity,
    ChevronRight,
    Monitor,
    Box,
    Network,
    Home
} from 'lucide-react';
import CIDashboard from './components/CIDashboard';
import CIDetails from './components/CIDetails';
import CICreateWizard from './components/CICreateWizard';

const API_BASE = 'http://localhost:3002';

const App = () => {
    const [tenants, setTenants] = useState([]);
    const [selectedTenant, setSelectedTenant] = useState(null);

    useEffect(() => {
        axios.get('http://localhost:3001/api/tenants').then(res => {
            setTenants(res.data);
            if (res.data.length > 0) setSelectedTenant(res.data[0]);
        });
    }, []);

    return (
        <Router>
            <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Database className="text-white" size={20} />
                        </div>
                        <span className="font-bold tracking-tight text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Runtime CMDB</span>
                    </div>

                    <div className="p-6">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-3 block tracking-widest">Select Tenant</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer text-sm"
                            value={selectedTenant?.id || ''}
                            onChange={(e) => setSelectedTenant(tenants.find(t => t.id === e.target.value))}
                        >
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.metadata?.name || t.id}</option>
                            ))}
                        </select>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-4 space-y-1">
                        <Link to={`/${selectedTenant?.id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-white group">
                            <Home size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm">Dashboard</span>
                        </Link>
                        <Link to={`/${selectedTenant?.id}/cis`} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-white group">
                            <Box size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-sm">CI Inventory</span>
                        </Link>
                    </nav>

                    <div className="p-6 border-t border-slate-800">
                        <div className="flex items-center gap-3 opacity-50 grayscale">
                            <Activity size={16} />
                            <span className="text-xs font-medium">Monitoring sync: Active</span>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 bg-slate-950/50 backdrop-blur-md z-10">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <span className="font-semibold text-slate-200">{selectedTenant?.metadata?.name || 'Loading...'}</span>
                            <ChevronRight size={14} className="opacity-50" />
                            <span className="capitalize">Runtime</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to={`/${selectedTenant?.id}/create`}>
                                <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                                    <Plus size={18} />
                                    <span>Create CI</span>
                                </button>
                            </Link>
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden">
                        <Routes>
                            <Route path="/:tenantId" element={<CIDashboard />} />
                            <Route path="/:tenantId/cis" element={<CIDashboard />} />
                            <Route path="/:tenantId/cis/:id" element={<CIDetails />} />
                            <Route path="/:tenantId/create" element={<CICreateWizard />} />
                        </Routes>
                    </div>
                </main>
            </div>
        </Router>
    );
};

export default App;
