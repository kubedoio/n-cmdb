import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import yaml from 'js-yaml';
import { Plus, Trash2, Save, X, Code, FileCode } from 'lucide-react';
import axios from 'axios';
import PreviewPanel from './PreviewPanel';

const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    target_type: z.string().min(1, 'Target CI Type is required'),
    description: z.string().optional(),
    defaults: z.array(z.object({
        key: z.string().min(1),
        value: z.string().min(1)
    })).optional(),
});

const TemplateEditor = ({
    tenant,
    ciTypes,
    initialData,
    onSave,
    onCancel
}: {
    tenant: any,
    ciTypes: any[],
    initialData?: any,
    onSave: (data: any) => void,
    onCancel: () => void
}) => {
    const [yamlPreview, setYamlPreview] = useState('');
    const [diff, setDiff] = useState('');
    const [plan, setPlan] = useState<any>(null);

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: initialData ? {
            name: initialData.name,
            target_type: initialData.spec?.target_type || ciTypes[0]?.name || '',
            defaults: Object.entries(initialData.spec?.defaults || {}).map(([key, value]) => ({ key, value: String(value) }))
        } : {
            name: '',
            target_type: ciTypes[0]?.name || '',
            defaults: [] as { key: string, value: string }[]
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
                defaults: (formData.defaults || []).reduce((acc: any, curr: any) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {} as any)
            }
        };
        const currentYaml = yaml.dump(spec, { sortKeys: true });
        setYamlPreview(currentYaml);

        // Generate Plan
        const steps: { action: string, resource: string }[] = [];
        const oldDefaults = initialData?.spec?.defaults || {};
        const newDefaults = spec.spec.defaults;

        Object.keys(newDefaults).forEach(k => {
            if (oldDefaults[k] === undefined) steps.push({ action: 'Set Default', resource: k });
            else if (oldDefaults[k] !== newDefaults[k]) steps.push({ action: 'Update Default', resource: k });
        });
        Object.keys(oldDefaults).forEach(k => {
            if (newDefaults[k] === undefined) steps.push({ action: 'Remove Default', resource: k });
        });

        setPlan(steps.length > 0 ? { steps } : null);

        // Generate simple Diff
        if (initialData) {
            const oldYaml = yaml.dump(initialData, { sortKeys: true });
            const oldLines = oldYaml.split('\n');
            const newLines = currentYaml.split('\n');
            let diffStr = '';
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

    const onSubmit = async (data: any) => {
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
        <div className="flex h-full animate-in fade-in duration-500 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 border-r border-border">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Template Name</label>
                            <input {...register('name')} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Target CI Type</label>
                            <select {...register('target_type')} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 transition-all">
                                {ciTypes.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Default Values</label>
                                <span className="text-[10px] text-muted-foreground/60 tracking-tight">Populated when creating CIs from this template</span>
                            </div>
                            <button type="button" onClick={() => append({ key: '', value: '' })} className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground p-1.5 rounded-lg transition-all border border-primary/20 shadow-sm">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-3 items-center p-3 border border-border/50 rounded-lg bg-card/30 group">
                                    <div className="col-span-11 grid grid-cols-2 gap-3">
                                        <input {...register(`defaults.${index}.key`)} placeholder="Key" className="bg-background border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30" />
                                        <input {...register(`defaults.${index}.value`)} placeholder="Value" className="bg-background border border-border/50 rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30" />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button type="button" onClick={() => remove(index)} className="text-destructive opacity-30 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-10 border-t border-border mt-auto">
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 shadow-xl shadow-primary/20 transition-all text-sm">
                            <Save size={20} /> Create Change Proposal (PR)
                        </button>
                        <button type="button" onClick={onCancel} className="px-8 border border-border rounded-xl hover:bg-accent transition-colors font-semibold">Cancel</button>
                    </div>
                </form>
            </div>

            <PreviewPanel yaml={yamlPreview} diff={diff} plan={plan} />
        </div>
    );
};

export default TemplateEditor;
