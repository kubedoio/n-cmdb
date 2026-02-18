import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft,
    Box,
    Share2,
    Activity,
    Info,
    Zap,
    ChevronRight,
    Plus,
    Network
} from 'lucide-react';

const CIDetails = () => {
    const { tenantId, id } = useParams();
    const [ci, setCi] = useState(null);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tenantId && id) fetchDetails();
    }, [tenantId, id]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [ciRes, graphRes] = await Promise.all([
                axios.get(`http://localhost:3002/${tenantId}/cis/${id}`),
                axios.get(`http://localhost:3002/${tenantId}/cis/${id}/graph`)
            ]);
            setCi(ciRes.data);
            setGraph(graphRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        </div>
    );

    if (!ci) return <div>CI not found.</div>;

    return (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-10">
            <div className="max-w-6xl mx-auto space-y-10">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to={`/${tenantId}/cis`} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors border border-slate-800">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase px-2 py-1 rounded">
                                    {ci.kind}
                                </span>
                                <span className="text-slate-500 text-xs font-mono">{ci.id}</span>
                            </div>
                            <h1 className="text-4xl font-black">{ci.name}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 text-sm font-bold">
                            <Activity size={16} />
                            Healthy
                        </div>
                        <button className="px-6 py-2.5 bg-slate-900 border border-slate-800 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm">
                            Edit Properties
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-100">

                    {/* Properties Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Info size={18} className="text-indigo-500" />
                                Properties
                            </h2>
                            <div className="space-y-4">
                                {Object.entries(ci.properties).map(([key, value]) => (
                                    <div key={key} className="group">
                                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1 group-hover:text-indigo-400 transition-colors">{key}</label>
                                        <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 font-mono text-sm group-hover:border-indigo-500/30 transition-all">
                                            {String(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                            <Zap className="mb-4" size={32} />
                            <h3 className="text-xl font-bold mb-2">Automated Discovery</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed mb-6 opacity-80">This CI is being tracked by the Prometheus monitoring source.</p>
                            <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg">
                                View Raw Metrics
                            </button>
                        </div>
                    </div>

                    {/* Visualization Panel */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 h-[600px] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent"></div>

                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <Network size={22} className="text-indigo-500" />
                                    Relationship Graph
                                </h2>
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button className="px-4 py-1.5 bg-slate-800 rounded-lg text-xs font-bold">Depth: 2</button>
                                    <button className="px-4 py-1.5 text-slate-500 rounded-lg text-xs font-bold hover:text-slate-300">Live</button>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center relative">
                                {/* Simplified Node/Link View */}
                                <div className="w-full h-full flex flex-wrap items-center justify-center gap-12 p-10">
                                    {graph.nodes.map((node, i) => (
                                        <div
                                            key={node.id}
                                            className={`
                          p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative z-10
                          ${node.id === ci.id
                                                    ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-600/40 scale-110'
                                                    : 'bg-slate-900 border-slate-800 hover:border-indigo-500 shadow-xl'
                                                }
                        `}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Box size={20} className={node.id === ci.id ? 'text-white' : 'text-slate-500'} />
                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${node.id === ci.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                                                    {node.kind}
                                                </span>
                                            </div>
                                            <div className="font-bold truncate max-w-[120px]">{node.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 p-4 bg-slate-950/80 backdrop-blur rounded-2xl border border-slate-800 flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500 z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <span>Source</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                                    <span>Target</span>
                                </div>
                            </div>
                        </div>

                        {/* Relations Table Summary */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold">Connections</h2>
                                <button className="flex items-center gap-2 text-indigo-500 text-sm font-bold hover:text-indigo-400 transition-colors">
                                    <Plus size={16} />
                                    Add Link
                                </button>
                            </div>

                            <div className="space-y-3">
                                {ci.relations.map((rel, i) => (
                                    <div key={rel.id} className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-colors">
                                        <div className="flex items-center gap-6">
                                            <div className="text-sm font-bold text-slate-300">
                                                {rel.source_ci_id === ci.id ? 'Outbound' : 'Inbound'}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 font-mono text-xs">{rel.kind}</span>
                                                <ChevronRight size={14} className="text-slate-700" />
                                                <span className="font-bold text-indigo-400">
                                                    {rel.source_ci_id === ci.id ? rel.target_name : rel.source_name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {ci.relations.length === 0 && (
                                    <div className="text-center py-6 text-slate-600 italic text-sm">No relationships defined.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CIDetails;
