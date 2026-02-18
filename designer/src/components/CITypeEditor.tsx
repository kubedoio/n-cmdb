import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import yaml from 'js-yaml';
import { Plus, Trash2, Save, X, Code } from 'lucide-react';
import axios from 'axios';

const attributeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['string', 'number', 'boolean', 'enum', 'dateTime', 'json', 'ref', 'secretRef']),
    required: z.boolean().default(false),
    readonly: z.boolean().default(false),
    description: z.string().optional(),
});

const ciTypeSchema = z.object({
    name: z.string().min(1, 'Type name is required'),
    description: z.string().optional(),
    attributes: z.array(attributeSchema).min(1, 'At least one attribute is required'),
});

const CITypeEditor = ({ tenant, initialData, onSave, onCancel }) => {
    const [yamlPreview, setYamlPreview] = useState('');

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(ciTypeSchema),
        defaultValues: initialData || {
            name: '',
            description: '',
            attributes: [{ name: 'hostname', type: 'string', required: true }]
        }
    });

    const { fields, append, remove } = useFieldArray({
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
                attributes: formData.attributes.reduce((acc, attr) => {
                    acc[attr.name] = {
                        type: attr.type,
                        required: attr.required,
                        readonly: attr.readonly,
                    };
                    return acc;
                }, {})
            }
        };
        setYamlPreview(yaml.dump(spec, { sortKeys: true }));
    }, [formData]);

    const onSubmit = async (data) => {
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
        } catch (err) {
            console.error("Failed to create PR", err);
            alert("Failed to create PR: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500">
            {/* Form Panel */}
            <div className="flex-1 overflow-y-auto pr-2">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Type Name</label>
                            <input
                                {...register('name')}
                                placeholder="e.g. VirtualMachine"
                                className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            {errors.name && <p className="text-destructive text-[10px] uppercase font-bold">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                            <input
                                {...register('description')}
                                placeholder="Brief purpose..."
                                className="w-full bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Attributes</label>
                            <button
                                type="button"
                                onClick={() => append({ name: '', type: 'string', required: false })}
                                className="text-primary hover:bg-primary/10 p-1 rounded-md transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-3 border border-border/50 rounded-lg bg-card/30 group">
                                <div className="col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground">Name</label>
                                    <input
                                        {...register(`attributes.${index}.name`)}
                                        className="w-full bg-background border border-border/50 rounded px-2 py-1 text-xs"
                                    />
                                </div>
                                <div className="col-span-3 space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground">Type</label>
                                    <select
                                        {...register(`attributes.${index}.type`)}
                                        className="w-full bg-background border border-border/50 rounded px-2 py-1 text-xs"
                                    >
                                        {['string', 'number', 'boolean', 'enum', 'dateTime', 'json', 'ref', 'secretRef'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 flex flex-col items-center gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground">Req</label>
                                    <input type="checkbox" {...register(`attributes.${index}.required`)} className="rounded border-border" />
                                </div>
                                <div className="col-span-2 flex flex-col items-center gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground">RO</label>
                                    <input type="checkbox" {...register(`attributes.${index}.readonly`)} className="rounded border-border" />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-destructive opacity-50 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {errors.attributes && <p className="text-destructive text-[10px] uppercase font-bold">{errors.attributes.message}</p>}
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="submit"
                            className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                        >
                            <Save size={18} />
                            Create Change Proposal (PR)
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>

            {/* Preview Panel */}
            <div className="w-[400px] border-l border-border pl-6 flex flex-col h-full overflow-hidden">
                <label className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2">
                    <Code size={14} />
                    GitOps YAML Preview
                </label>
                <div className="flex-1 bg-zinc-950 rounded-xl p-4 overflow-y-auto border border-white/5 font-mono text-[11px] text-zinc-300 shadow-2xl">
                    <pre>{yamlPreview}</pre>
                </div>
            </div>
        </div>
    );
};

export default CITypeEditor;
