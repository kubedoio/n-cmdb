import React, { useState } from 'react';
import { Code, GitBranch, Activity, CheckCircle2, ChevronRight } from 'lucide-react';

const PreviewPanel = ({ yaml, diff, plan }: {
    yaml: string,
    diff?: string,
    plan?: any
}) => {
    const [activeTab, setActiveTab] = useState<'yaml' | 'diff' | 'plan'>('yaml');

    return (
        <div className="w-[400px] flex flex-col h-full overflow-hidden bg-zinc-950/20 backdrop-blur-2xl border-l border-border">
            <div className="flex border-b border-border bg-card/30">
                <button
                    onClick={() => setActiveTab('yaml')}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'yaml' ? 'bg-accent/40 border-b-2 border-primary text-primary' : 'text-muted-foreground hover:bg-accent/20'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <Code size={12} /> YAML
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('diff')}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'diff' ? 'bg-accent/40 border-b-2 border-primary text-primary' : 'text-muted-foreground hover:bg-accent/20'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <GitBranch size={12} /> Diff
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'plan' ? 'bg-accent/40 border-b-2 border-primary text-primary' : 'text-muted-foreground hover:bg-accent/20'
                        }`}
                >
                    <div className="flex items-center gap-1.5">
                        <Activity size={12} /> Plan
                    </div>
                </button>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'yaml' && (
                    <div className="h-full p-6 overflow-y-auto font-mono text-[11px] text-zinc-300 leading-relaxed scrollbar-hide animate-in fade-in slide-in-from-right-1 duration-300">
                        <pre>{yaml}</pre>
                    </div>
                )}

                {activeTab === 'diff' && (
                    <div className="h-full p-6 overflow-y-auto font-mono text-[11px] leading-relaxed animate-in fade-in slide-in-from-right-1 duration-300">
                        {diff ? (
                            <pre className="whitespace-pre-wrap">
                                {diff.split('\n').map((line, i) => {
                                    const isAdded = line.startsWith('+');
                                    const isRemoved = line.startsWith('-');
                                    return (
                                        <div key={i} className={`${isAdded ? 'text-emerald-400 bg-emerald-500/10 -mx-6 px-6' : isRemoved ? 'text-rose-400 bg-rose-500/10 -mx-6 px-6' : 'text-zinc-400'}`}>
                                            {line}
                                        </div>
                                    );
                                })}
                            </pre>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                                <GitBranch size={32} />
                                <p className="text-[10px] uppercase font-bold tracking-widest">No changes detected</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'plan' && (
                    <div className="h-full p-6 overflow-y-auto animate-in fade-in slide-in-from-right-1 duration-300">
                        {plan ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <CheckCircle2 size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Execution Plan Ready</span>
                                </div>
                                <div className="space-y-2">
                                    {plan.steps?.map((step: any, i: number) => (
                                        <div key={i} className="flex gap-3 p-3 bg-white/5 rounded-lg border border-white/5 items-start">
                                            <div className="bg-primary/20 text-primary p-1 rounded-md mt-0.5">
                                                <ChevronRight size={12} />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-semibold text-zinc-200">{step.action}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{step.resource}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                                <Activity size={32} />
                                <p className="text-[10px] uppercase font-bold tracking-widest">No plan available yet</p>
                                <p className="text-[9px] max-w-[200px] leading-relaxed">
                                    The execution plan is generated when you are ready to propose changes.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-4 bg-primary/5 border-t border-primary/10 m-4 rounded-xl">
                <p className="text-[10px] text-primary/80 font-medium mb-1 uppercase tracking-tight flex items-center gap-1.5">
                    <Activity size={12} /> Live Sync
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                    Previewing {activeTab.toUpperCase()} for current draft. Changes are safe and local.
                </p>
            </div>
        </div>
    );
};

export default PreviewPanel;
