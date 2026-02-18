import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Box, ChevronRight, Filter, Database } from 'lucide-react';

const CIDashboard = () => {
    const { tenantId } = useParams();
    const [cis, setCis] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (tenantId) fetchCIs();
    }, [tenantId]);

    const fetchCIs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:3002/${tenantId}/cis`);
            setCis(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCis = cis.filter(ci =>
        ci.name.toLowerCase().includes(search.toLowerCase()) ||
        ci.kind.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-10 max-w-7xl mx-auto h-full overflow-y-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
                        <Database className="text-indigo-500" size={32} />
                        CI Inventory
                    </h1>
                    <p className="text-slate-400 font-medium">Manage and monitor your configuration items.</p>
                </div>

                <div className="relative group w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or type..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCis.map(ci => (
                    <Link to={`/${tenantId}/cis/${ci.id}`} key={ci.id}>
                        <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-indigo-500/50 hover:bg-slate-900 transition-all group relative overflow-hidden active:scale-[0.98]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-colors"></div>

                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                    <Box className="group-hover:text-white" size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-full uppercase tracking-tighter">
                                        {ci.kind}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-2 truncate group-hover:text-indigo-400 transition-colors">{ci.name}</h3>

                            <div className="space-y-2 mb-6">
                                {Object.entries(ci.properties).slice(0, 2).map(([k, v]) => (
                                    <div className="flex items-center justify-between text-xs" key={k}>
                                        <span className="text-slate-500 font-medium uppercase tracking-tight">{k}</span>
                                        <span className="text-slate-300 font-mono">{String(v)}</span>
                                    </div>
                                ))}
                                {Object.keys(ci.properties).length > 2 && (
                                    <div className="text-[10px] text-slate-600 font-bold italic">
                                        + {Object.keys(ci.properties).length - 2} more properties
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Active</span>
                                <div className="flex items-center gap-1 text-indigo-500 font-bold text-xs">
                                    <span>Details</span>
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredCis.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-900 rounded-[4rem]">
                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                            <Filter className="text-slate-700" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No configuration items found</h2>
                        <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your search or create a new CI to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CIDashboard;
