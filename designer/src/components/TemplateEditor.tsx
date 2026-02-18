import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import yaml from 'js-yaml';
import { Plus, Trash2, Save, X, Code, FileCode } from 'lucide-react';
import axios from 'axios';

const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    target_type: z.string().min(1, 'Target CI Type is required'),
    description: z.string().optional(),
    defaults: z.array(z.object({
        key: z.string().min(1),
        value: z.string().min(1)
    })).optional(),
});

const TemplateEditor = ({ tenant, ciTypes, onSave, onCancel }) => {
    const [yamlPreview, setYamlPreview] = useState('');

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            name: '',
            target_type: ciTypes[0]?.name || '',
            defaults: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "defaults"
    });

    const formData = watch();

    useEffect(() => {
        const spec = {
            kind: 'Template',
            metadata: { name: formData.name },
            spec: {
                target_type: formData.target_type,
                defaults: (formData.defaults || []).reduce((acc, curr) => {
                    acc[curr.key] = curr.value;
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
                kind: 'templates',
                name: data.name,
                content: spec,
                summary: `Create Template ${data.name}`
            });
            onSave(res.data);
        } catch (err) {
            console.error(err);
            alert("Error creating PR");
        }
    };

    return (
        <div className="flex h-full gap-6">
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Template Name</label>
                            <input {...register('name')} className="w-full bg-background border border-border rounded-md px-3 py-2" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Target CI Type</label>
                            <select {...register('target_type')} className="w-full bg-background border border-border rounded-md px-3 py-2">
                                {ciTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <label className="text-xs font-bold uppercase text-muted-foreground">Default Values</label>
                            <button type="button" onClick={() => append({ key: '', value: '' })} className="text-primary hover:bg-primary/10 p-1 rounded-md">
                                <Plus size={18} />
                            </button>
                        </div>
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex gap-3 items-center">
                                <input {...register(`defaults.${index}.key`)} placeholder="Key" className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs" />
                                <input {...register(`defaults.${index}.value`)} placeholder="Value" className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs" />
                                <button type="button" onClick={() => remove(index)} className="text-destructive"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                            <Save size={18} /> Create PR
                        </button>
                        <button type="button" onClick={onCancel} className="px-6 border border-border rounded-lg">Cancel</button>
                    </div>
                </form>
            </div>

            <div className="w-[400px] border-l border-border pl-6 flex flex-col h-full overflow-hidden">
                <label className="text-xs font-bold uppercase text-muted-foreground mb-4 flex items-center gap-2 font-mono">
                    <Code size={14} /> Preview
                </label>
                <div className="flex-1 bg-zinc-950 rounded-xl p-4 overflow-y-auto border border-white/5 font-mono text-[11px] text-zinc-300">
                    <pre>{yamlPreview}</pre>
                </div>
            </div>
        </div>
    );
};

export default TemplateEditor;
