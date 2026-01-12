'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Upload, FileText, CheckCircle2,
    Trash2, ChevronRight, Loader2, Dumbbell, Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Program } from '@/types';

interface ProgramManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProgram: (program: Program, dbId?: string) => void;
    currentProgramId?: string;
    user: User | null;
}

export default function ProgramManager({ isOpen, onClose, onSelectProgram, currentProgramId, user }: ProgramManagerProps) {
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // AI State
    const [prompt, setPrompt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState<Program | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient();

    useEffect(() => {
        if (isOpen && activeTab === 'list') {
            fetchPrograms();
        }
    }, [isOpen, activeTab]);

    const fetchPrograms = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await supabase
            .from('programs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setPrograms(data);
        setLoading(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleGenerate = async () => {
        if (!prompt && !selectedFile) return;

        setIsGenerating(true);
        try {
            // Prepare body
            const formData = new FormData();
            formData.append('prompt', prompt);
            if (selectedFile) {
                // Convert to base64 for simple API handling or send as formData if API supports it
                // Here we'll do client-side base64 conversion to keep API logic simple for this demo
                const reader = new FileReader();
                reader.readAsDataURL(selectedFile);
                reader.onload = async () => {
                    const base64 = reader.result as string;

                    const res = await fetch('/api/generate-program', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt,
                            image: base64 // Send full data URL
                        }),
                    });

                    if (!res.ok) throw new Error('Generation failed');
                    const data = await res.json();
                    setGeneratedProgram(data);
                    setIsGenerating(false);
                };
            } else {
                const res = await fetch('/api/generate-program', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt }),
                });
                if (!res.ok) throw new Error('Generation failed');
                const data = await res.json();
                setGeneratedProgram(data);
                setIsGenerating(false);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la génération");
            setIsGenerating(false);
        }
    };

    const handleSelect = async (prog: any) => {
        setLoading(true);
        // 1. Set all user's programs to inactive
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('programs').update({ is_active: false }).eq('user_id', user.id);
            // 2. Set this one to active
            await supabase.from('programs').update({ is_active: true }).eq('id', prog.id);

            // 3. Update UI
            onSelectProgram(prog.content, prog.id);
        }
        setLoading(false);
    };

    const saveAndSelect = async () => {
        if (!generatedProgram) return;

        // If user is authenticated, save to DB
        if (user) {
            // Deactivate others
            await supabase.from('programs').update({ is_active: false }).eq('user_id', user.id);

            const { data, error } = await supabase.from('programs').insert({
                user_id: user.id,
                title: generatedProgram.title,
                description: generatedProgram.description,
                content: generatedProgram,
                is_active: true
            }).select().single();

            if (!error && data) {
                // UI Update
                onSelectProgram(generatedProgram, data.id);
                // Refresh list so it appears in "Mes Programmes"
                await fetchPrograms();
                onClose();
            } else {
                console.error("Error saving:", error);
                alert("Erreur lors de la sauvegarde vers la base de données.");
            }
        } else {
            // Fallback: No user - just select locally without saving to DB
            console.warn("No authenticated user - saving locally only");
            onSelectProgram(generatedProgram, 'local-' + Date.now());
            onClose();
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Supprimer ce programme ?')) {
            await supabase.from('programs').delete().eq('id', id);
            fetchPrograms();
        }
    };

    const suggestions = [
        "💪 Prise de Masse (4 jours)",
        "🔥 Sèche Express (30 min)",
        "🏠 Poids du Corps (Sans matériel)",
        "🏋️‍♂️ Force & Powerlifting",
        "🧘‍♂️ Souplesse & Mobilité",
        "🏃‍♂️ Cardio & Endurance"
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">

                {/* HEADER */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Mes Programmes
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'create' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Sparkles size={14} /> Nouveau (IA)
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="overflow-y-auto flex-1 p-4 bg-slate-50">

                    {activeTab === 'list' && (
                        <div className="space-y-3">
                            {/* Default Reference Program */}
                            <div
                                onClick={() => onSelectProgram({} as any, 'reference')}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden ${currentProgramId === 'reference' ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="p-3 bg-slate-900 text-white rounded-lg h-fit">
                                            <Dumbbell size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">Programme Velox</h3>
                                            <p className="text-xs text-slate-500 font-medium mt-1">Le programme original (Cycles 1-4)</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Complet</span>
                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">4 Cycles</span>
                                            </div>
                                        </div>
                                    </div>
                                    {currentProgramId === 'reference' && <CheckCircle2 className="text-indigo-600" size={24} />}
                                </div>
                            </div>

                            {/* User Programs */}
                            {loading ? (
                                <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> Chargement...</div>
                            ) : programs.map(prog => (
                                <div
                                    key={prog.id}
                                    onClick={() => handleSelect(prog)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative group ${currentProgramId === prog.id ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg h-fit">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 line-clamp-1">{prog.title}</h3>
                                                <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2">{prog.description}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                                                        {new Date(prog.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {currentProgramId === prog.id ? (
                                            <CheckCircle2 className="text-indigo-600" size={24} />
                                        ) : (
                                            <button
                                                onClick={(e) => handleDelete(prog.id, e)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div className="h-full flex flex-col">
                            {!generatedProgram ? (
                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            accept="image/*,.pdf"
                                        />
                                        {filePreview ? (
                                            <div className="relative h-32 w-full">
                                                <img src={filePreview} className="h-full w-full object-contain rounded-lg" alt="Preview" />
                                                <button onClick={(e) => { e.stopPropagation(); setFilePreview(null); setSelectedFile(null) }} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <Upload size={32} />
                                                <p className="font-bold text-sm text-slate-600">Ajouter un fichier</p>
                                                <p className="text-xs">Image, Capture d'écran, PDF...</p>
                                            </div>
                                        )}
                                    </div>

                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Décrivez votre objectif ou donnez des détails sur le fichier (ex: 'Transforme cette capture d'écran de programme en plan sur 4 jours')"
                                        className="w-full h-24 p-4 rounded-xl bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-700 resize-none text-sm"
                                    />

                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setPrompt(s)}
                                                className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || (!prompt && !selectedFile)}
                                        className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                                        {isGenerating ? "L'IA travaille..." : "Générer le Programme"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                        <h3 className="font-bold text-lg text-slate-800">{generatedProgram.title}</h3>
                                        <p className="text-sm text-slate-500 mb-2">{generatedProgram.description}</p>
                                        <div className="flex gap-2 text-xs">
                                            <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded-md">{generatedProgram.sessions.length} Séances</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGeneratedProgram(null)}
                                            className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl"
                                        >
                                            Retour
                                        </button>
                                        <button
                                            onClick={saveAndSelect}
                                            className="flex-[2] py-3 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200"
                                        >
                                            Utiliser ce programme
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}
