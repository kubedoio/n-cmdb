import React from 'react';
import { CheckCircle2, GitPullRequest, ExternalLink, X } from 'lucide-react';

const PRSuccess = ({ data, onDismiss }) => {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
                <button onClick={onDismiss} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X size={20} />
                </button>

                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-emerald-500" size={32} />
                </div>

                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent text-center mb-2">
                    Change Proposal Created
                </h2>
                <p className="text-muted-foreground text-center mb-8">
                    Your changes have been staged to a new branch and a Pull Request is ready for review.
                </p>

                <div className="bg-accent/50 rounded-xl p-4 mb-8 space-y-3 font-mono text-xs">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="text-primary truncate ml-4 font-bold">{data.branch}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Planned Action:</span>
                        <span className="text-foreground">{data.summary}</span>
                    </div>
                </div>

                <a
                    href={data.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-4 shadow-lg shadow-primary/20"
                >
                    <GitPullRequest size={18} />
                    View Pull Request
                    <ExternalLink size={14} className="opacity-50" />
                </a>

                <button
                    onClick={onDismiss}
                    className="w-full text-muted-foreground hover:text-foreground font-medium py-2 rounded-lg transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};

export default PRSuccess;
