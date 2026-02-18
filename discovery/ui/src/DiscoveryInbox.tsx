import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    CheckCircle2,
    XCircle,
    Merge,
    ExternalLink,
    Activity,
    ShieldAlert,
    Clock,
    Fingerprint,
    ChevronRight,
    Search,
    Filter
} from 'lucide-react';

interface Candidate {
    id: string;
    fingerprint: string;
    ci_type: string;
    props: Record<string, string>;
    confidence: number;
    last_seen: string;
}

const DiscoveryInbox = () => {
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await axios.get('http://localhost:3002/api/discovery/candidates');
            setCandidates(res.data);
            if (res.data.length > 0 && !selectedCandidate) setSelectedCandidate(res.data[0]);
        } catch (err) {
            console.error("Failed to fetch candidates", err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await axios.post(`http://localhost:3002/api/discovery/candidates/${id}/approve`);
            setCandidates(candidates.filter((c: Candidate) => c.id !== id));
            setSelectedCandidate(null);
        } catch (err) {
            alert("Approval failed");
        }
    };


    return (
        <div className="flex h-full bg-background font-sans overflow-hidden">
            {/* List Pane */}
            <div className="w-[60%] border-r border-border flex flex-col bg-card/5">
                <header className="p-6 border-b border-border space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <Activity className="text-primary" /> Discovery Inbox
                            </h1>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60">Pending Approval Queue</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold">
                                {candidates.length} New Candidates
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                            <input placeholder="Search candidates..." className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                        </div>
                        <button className="px-4 py-2 border border-border rounded-xl hover:bg-accent transition-colors flex items-center gap-2 text-sm font-semibold">
                            <Filter size={16} /> Filter
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-full opacity-50 italic">Scanning inbox...</div>
                    ) : candidates.map((candidate: Candidate) => (
                        <div
                            key={candidate.id}
                            onClick={() => setSelectedCandidate(candidate)}
                            className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedCandidate?.id === candidate.id
                                ? 'bg-primary/5 border-primary/30 shadow-lg shadow-primary/5'
                                : 'bg-card border-border/50 hover:border-border hover:shadow-md'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${candidate.confidence > 0.8 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                <Activity size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-sm truncate">{candidate.props.hostname || 'Unidentified Asset'}</h3>
                                    <span className="text-[10px] font-mono text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded uppercase">{candidate.ci_type}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(candidate.last_seen).toLocaleTimeString()}</span>
                                    <span className="flex items-center gap-1 font-mono">{candidate.props.ip || 'no-ip'}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-16 h-1 bg-accent rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${candidate.confidence * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold">{(candidate.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <ChevronRight size={16} className={`transition-transform ${selectedCandidate?.id === candidate.id ? 'translate-x-1 text-primary' : 'text-muted-foreground/30'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Pane */}
            <div className="flex-1 overflow-y-auto bg-background p-8">
                {selectedCandidate ? (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <header className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                                <Fingerprint size={12} /> Fingerprint: {selectedCandidate.fingerprint}
                            </div>
                            <h2 className="text-3xl font-black">{selectedCandidate.props.hostname || 'Asset Review'}</h2>
                        </header>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Confidence Score</span>
                                <div className="text-2xl font-bold text-emerald-500">{(selectedCandidate.confidence * 100).toFixed(1)}%</div>
                            </div>
                            <div className="p-4 bg-card border border-border rounded-2xl space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Discovery Source</span>
                                <div className="text-2xl font-bold truncate">Checkmk</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Discovered Properties</h3>
                            <div className="border border-border rounded-2xl overflow-hidden bg-card/30">
                                {Object.entries(selectedCandidate.props).map(([k, v]) => (
                                    <div key={k} className="flex justify-between p-4 border-b border-border/50 last:border-0 hover:bg-white/5 transition-colors">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{k.replace('_', ' ')}</span>
                                        <span className="text-xs font-mono font-semibold">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedCandidate.fingerprint.startsWith('weak:') && (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4">
                                <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-amber-500 uppercase">Weak Identifier Warning</h4>
                                    <p className="text-xs text-amber-500/80 leading-relaxed">
                                        This asset was identified by Hostname + IP only. Deduplication may be inaccurate if multiple devices share these attributes.
                                    </p>
                                </div>
                            </div>
                        )}

                        <footer className="flex gap-4 pt-10 border-t border-border mt-auto">
                            <button
                                onClick={() => handleApprove(selectedCandidate.id)}
                                className="flex-[2] bg-primary text-primary-foreground font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
                            >
                                <CheckCircle2 size={20} /> Approve & Create CI
                            </button>
                            <button className="flex-1 border border-border hover:bg-accent text-foreground font-bold py-4 rounded-2xl transition-all">
                                Reject
                            </button>
                        </footer>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20">
                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-foreground/30 flex items-center justify-center animate-pulse">
                            <Activity size={48} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black uppercase tracking-widest">Inbox Empty</h2>
                            <p className="text-sm font-medium">Select a candidate asset to review and finalize</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscoveryInbox;
