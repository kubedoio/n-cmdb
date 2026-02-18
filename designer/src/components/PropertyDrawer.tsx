import React from 'react';
import { X, Check } from 'lucide-react';

const PropertyDrawer = ({ isOpen, onClose, property, onSave }: {
    isOpen: boolean,
    onClose: () => void,
    property: any,
    onSave: (data: any) => void
}) => {
    if (!isOpen) return null;

    const [data, setData] = React.useState(property);

    React.useEffect(() => {
        setData(property);
    }, [property]);

    const handleSave = () => {
        onSave(data);
        onClose();
    };

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-card border-l border-border shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-accent/20">
                <div className="flex flex-col">
                    <h3 className="font-bold text-sm uppercase tracking-wider">Property Details</h3>
                    <span className="text-[10px] text-muted-foreground font-mono">{data.name || 'New Property'}</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <X size={20} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Display Name</label>
                        <input
                            value={data.displayName || ''}
                            onChange={e => setData({ ...data, displayName: e.target.value })}
                            placeholder="e.g. Hostname"
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Description</label>
                        <textarea
                            value={data.description || ''}
                            onChange={e => setData({ ...data, description: e.target.value })}
                            placeholder="Attribute purpose..."
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Constraints</h4>

                    <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border/50">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold">Required</span>
                            <span className="text-[10px] text-muted-foreground">Value must be present</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={data.required}
                            onChange={e => setData({ ...data, required: e.target.checked })}
                            className="w-4 h-4 rounded border-border bg-background"
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border/50">
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold">Read Only</span>
                            <span className="text-[10px] text-muted-foreground">Cannot be changed after creation</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={data.readonly}
                            onChange={e => setData({ ...data, readonly: e.target.checked })}
                            className="w-4 h-4 rounded border-border bg-background"
                        />
                    </div>
                </div>

                {data.type === 'enum' && (
                    <div className="space-y-4 pt-4 border-t border-border">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Enum Values</label>
                        <input
                            placeholder="Comma separated values..."
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                )}

                <div className="pt-6">
                    <button className="text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-1 hover:underline">
                        Advanced Configuration
                    </button>
                </div>
            </div>

            <footer className="p-6 border-t border-border bg-accent/5 flex gap-3">
                <button
                    onClick={handleSave}
                    className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
                >
                    <Check size={18} />
                    Apply Changes
                </button>
            </footer>
        </div>
    );
};

export default PropertyDrawer;
