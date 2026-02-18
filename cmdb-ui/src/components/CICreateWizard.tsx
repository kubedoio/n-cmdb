import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft,
    Layout,
    Box,
    ChevronRight,
    Check,
    FileCode,
    Rocket,
    Zap,
    CheckCircle2,
    FileText
} from 'lucide-react';

const CICreateWizard = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [templates, setTemplates] = useState([]);
    const [types, setTypes] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [formData, setFormData] = useState({ name: '', properties: {} });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (tenantId) {
            axios.get(`http://localhost:3002/${tenantId}/templates`).then(res => setTemplates(res.data));
            axios.get(`http://localhost:3002/${tenantId}/ci-types`).then(res => setTypes(res.data));
        }
    }, [tenantId]);

    const handleTemplateSelect = (tmpl) => {
        setSelectedTemplate(tmpl);
        setSelectedType(types.find(t => t.name === tmpl.spec.target_type));
        setFormData({
            name: '',
            properties: { ...tmpl.spec.defaults }
        });
        setStep(2);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await axios.post(`http://localhost:3002/${tenantId}/cis`, {
                kind: selectedTemplate ? selectedTemplate.spec.target_type : selectedType.name,
                name: formData.name,
                properties: formData.properties
            });
            navigate(`/${tenantId}/cis/${res.data.id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-950 p-10">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-6 mb-12">
                    <Link to={`/${tenantId}`} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-colors border border-slate-800">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black mb-1">Create Configuration Item</h1>
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                            <span className={`${step >= 1 ? 'text-indigo-500' : ''}`}>1. Select Blueprint</span>
                            <ChevronRight size={14} />
                            <span className={`${step >= 2 ? 'text-indigo-500' : ''}`}>2. Configure Details</span>
                        </div>
                    </div>
                </div>

                {step === 1 && (
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Layout size={20} className="text-indigo-500" />
                                Templates
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templates.map(tmpl => (
                                    <div
                                        key={tmpl.name}
                                        onClick={() => handleTemplateSelect(tmpl)}
                                        className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-indigo-500 transition-all cursor-pointer group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                                <Zap size={20} className="group-hover:text-white" />
                                            </div>
                                            <h3 className="font-bold text-lg">{tmpl.name}</h3>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-6">Pre-configured blueprint for {tmpl.spec.target_type} resources.</p>
                                        <div className="flex bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 text-[10px] font-black tracking-widest uppercase text-slate-500 gap-4">
                                            <div className="flex items-center gap-2">
                                                <Check size={12} className="text-emerald-500" />
                                                Defaults Set
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-400">
                                <Box size={20} />
                                Raw CI Types
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-70">
                                {types.map(type => (
                                    <div
                                        key={type.name}
                                        className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-2xl hover:bg-slate-900 transition-all cursor-pointer text-sm font-bold flex items-center justify-between hover:border-slate-700"
                                    >
                                        {type.name}
                                        <ChevronRight size={14} className="text-slate-700" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
                                    <FileText className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">Configuration</h2>
                                    <p className="text-slate-400 text-sm font-medium">Using template: <span className="text-indigo-400">{selectedTemplate.name}</span></p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                            >
                                Change Blueprint
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 block">CI Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. prod-web-server-01"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-lg font-bold"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                {selectedType && Object.entries(selectedType.spec.attributes).map(([key, attr]) => (
                                    <div key={key}>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block flex items-center gap-2">
                                            {key}
                                            {attr.required && <span className="text-rose-500">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 outline-none focus:border-indigo-500 transition-all text-sm font-mono placeholder:text-slate-700"
                                            placeholder={attr.type}
                                            value={formData.properties[key] || ''}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                properties: { ...formData.properties, [key]: e.target.value }
                                            })}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-10 flex items-center gap-4">
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.name || submitting}
                                className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none"
                            >
                                {submitting ? (
                                    <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent"></div>
                                ) : (
                                    <>
                                        <Rocket size={24} />
                                        Provision CI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CICreateWizard;
