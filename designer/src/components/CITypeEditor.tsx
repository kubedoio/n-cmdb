import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import yaml from 'js-yaml';
import { Plus, Trash2, Save, X, Code, Settings, Activity } from 'lucide-react';
import axios from 'axios';
import PropertyDrawer from './PropertyDrawer';
import PreviewPanel from './PreviewPanel';

const attributeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'dateTime', 'json', 'ref', 'secretRef']),
    required: z.boolean().default(false),
    readonly: z.boolean().default(false),
    description: z.string().optional(),
    displayName: z.string().optional(),
});

const ciTypeSchema = z.object({
    name: z.string().min(1, 'Type name is required'),
    description: z.string().optional(),
    attributes: z.array(attributeSchema).min(1, 'At least one attribute is required'),
});

const CITypeEditor = ({
    tenant,
    initialData,
    onSave,
    onCancel
}: {
    tenant: any,
    initialData?: any,
    onSave: (data: any) => void,
    onCancel: () => void
}) => {
    const [yamlPreview, setYamlPreview] = useState('');
    const [diff, setDiff] = useState('');
    const [plan, setPlan] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activePropertyIndex, setActivePropertyIndex] = useState<number | null>(null);

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: zodResolver(ciTypeSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.spec?.description || '',
            attributes: Object.entries(initialData.spec?.attributes || {}).map(([name, attr]: [string, any]) => ({
                name,
                type: attr.type,
                required: attr.required,
                readonly: attr.readonly,
                description: attr.description,
                displayName: attr.displayName || name
            }))
        } : {
            name: '',
            description: '',
            attributes: [{ name: 'hostname', type: 'string', required: true, displayName: 'Hostname' }]
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "attributes"
    });

    const formData = watch();

    useEffect(() => {
        const spec = {
            kind: 'CIType',
            metadata: { name: formData.name },
            spec: {
                description: formData.description,
                attributes: formData.attributes.reduce((acc: any, attr: any) => {
                    acc[attr.name] = {
                        type: attr.type,
                        required: attr.required,
                        readonly: attr.readonly,
                        ...(attr.description && { description: attr.description }),
                        ...(attr.displayName && { displayName: attr.displayName })
                    };
                    return acc;
                }, {})
            }
        };
        const currentYaml = yaml.dump(spec, { sortKeys: true });
        setYamlPreview(currentYaml);

        // Generate Plan
        const steps: { action: string, resource: string }[] = [];
        const oldAttrs = initialData?.spec?.attributes || {};
        const newAttrs = spec.spec.attributes;

        Object.keys(newAttrs).forEach(k => {
            if (!oldAttrs[k]) steps.push({ action: 'Create Property', resource: k });
            else {
                const changed = JSON.stringify(oldAttrs[k]) !== JSON.stringify(newAttrs[k]);
                if (changed) steps.push({ action: 'Update Property', resource: k });
            }
        });
        Object.keys(oldAttrs).forEach(k => {
            if (!newAttrs[k]) steps.push({ action: 'Delete Property', resource: k });
        });

        setPlan(steps.length > 0 ? { steps } : null);

        // Generate simple Diff
        if (initialData) {
            const oldYaml = yaml.dump(initialData, { sortKeys: true });
            const oldLines = oldYaml.split('\n');
            const newLines = currentYaml.split('\n');
            let diffStr = '';
            // Very primitive diff logic for visual purposes
            newLines.forEach((line: string) => {
                if (!oldLines.includes(line)) diffStr += `+ ${line}\n`;
                else diffStr += `  ${line}\n`;
            });
            oldLines.forEach((line: string) => {
                if (!newLines.includes(line)) diffStr += `- ${line}\n`;
            });
            setDiff(diffStr);
        } else {
            setDiff(currentYaml.split('\n').map((l: string) => `+ ${l}`).join('\n'));
        }
    }, [formData, initialData]);

    const handleEditProperty = (index: number) => {
        setActivePropertyIndex(index);
        setIsDrawerOpen(true);
    };

    const handleDrawerSave = (updatedAttr: any) => {
        if (activePropertyIndex !== null) {
            update(activePropertyIndex, updatedAttr);
        }
    };

    const addPreset = (name: string, type: string) => {
        append({
            name,
            type: type as any,
            required: false,
            displayName: name.charAt(0).toUpperCase() + name.slice(1)
        });
    };

    const onSubmit = async (data: any) => {
        const spec = yaml.load(yamlPreview);
        try {
            const res = await axios.post('/api/pr', {
                tenant: tenant.id,
                kind: 'citypes',
                name: data.name,
                content: spec,
                summary: `Create/Update CIType ${data.name}`
            });
            onSave(res.data);
        } catch (err: any) {
            console.error("Failed to create PR", err);
            alert("Failed to create PR: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="flex h-full animate-in fade-in duration-500 overflow-hidden">
            {/* Form Panel */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-border">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Type Name</label>
                            <input
                                {...register('name')}
                                placeholder="e.g. VirtualMachine"
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                            />
                            {errors.name && <p className="text-destructive text-[10px] uppercase font-bold pl-1">{errors.name.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Description</label>
                            <input
                                {...register('description')}
                                placeholder="Brief purpose..."
                                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Properties</label>
                                <span className="text-[10px] text-muted-foreground/60 tracking-tight">Define schemas and validation rules</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex bg-accent/30 p-1 rounded-lg border border-border/50 gap-1 mr-2">
                                    {['environment', 'owner', 'location'].map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => addPreset(preset, 'string')}
                                            className="px-2 py-1 text-[9px] font-bold uppercase tracking-tighter hover:bg-accent hover:text-foreground rounded transition-colors text-muted-foreground"
                                        >
                                            +{preset}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => append({ name: '', type: 'string' as any, required: false, displayName: '' })}
                                    className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground p-1.5 rounded-lg transition-all border border-primary/20 shadow-sm"
                                    title="Add Property"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Property Table */}
                        <div className="border border-border rounded-xl overflow-hidden bg-card/10 shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-accent/30 text-[10px] font-bold uppercase text-muted-foreground tracking-wider border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3">Property Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-center w-20">Req</th>
                                        <th className="px-4 py-3 text-center w-20">RO</th>
                                        <th className="px-4 py-3 text-right w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="group hover:bg-accent/20 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <input
                                                    {...register(`attributes.${index}.name`)}
                                                    className="w-full bg-transparent border-none p-0 focus:ring-0 font-mono text-xs placeholder:text-muted-foreground/30"
                                                    placeholder="key_name"
                                                />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <select
                                                    {...register(`attributes.${index}.type`)}
                                                    className="bg-transparent border-none p-0 focus:ring-0 text-xs w-full cursor-pointer hover:text-primary transition-colors appearance-none"
                                                >
                                                    {['string', 'number', 'boolean', 'enum', 'dateTime', 'json', 'ref', 'secretRef'].map(t => (
                                                        <option key={t} value={t} className="bg-background">{t}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <input type="checkbox" {...register(`attributes.${index}.required`)} className="rounded border-border text-primary focus:ring-0 bg-transparent" />
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <input type="checkbox" {...register(`attributes.${index}.readonly`)} className="rounded border-border text-primary focus:ring-0 bg-transparent" />
                                            </td>
                                            <td className="px-4 py-2.5 text-right flex justify-end gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditProperty(index)}
                                                    className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-colors"
                                                    title="Advanced Settings"
                                                >
                                                    <Settings size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fields.length === 0 && (
                                <div className="p-8 text-center italic text-muted-foreground text-[11px]">
                                    No properties defined yet. Click the + button to add one.
                                </div>
                            )}
                        </div>
                        {errors.attributes && <p className="text-destructive text-[10px] uppercase font-bold pl-1">{errors.attributes.message as string}</p>}
                    </div>

                    <div className="flex gap-4 pt-10 border-t border-border mt-auto">
                        <button
                            type="submit"
                            className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20 text-sm"
                        >
                            <Save size={20} />
                            Create Change Proposal (PR)
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-8 border border-border rounded-xl hover:bg-accent transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            {/* Pane C: Preview Panel */}
            <PreviewPanel yaml={yamlPreview} diff={diff} plan={plan} />

            <PropertyDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                property={activePropertyIndex !== null ? formData.attributes[activePropertyIndex] : null}
                onSave={handleDrawerSave}
            />
        </div>
    );
};

export default CITypeEditor;
