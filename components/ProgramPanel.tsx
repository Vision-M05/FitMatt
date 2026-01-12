import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronRight, Dumbbell, Settings, Calendar, RefreshCcw, Pencil, X, GripVertical,
    Sparkles, Upload, FileText, CheckCircle2, Trash2, Loader2, Plus, Grid, ArrowLeft, BookOpen
} from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface ProgramPanelProps {
    fullData: any;
    activeCycle: number;
    activeSessionIdx: number;
    user: any;
    onSelectCycle: (index: number) => void;
    onSelectSession: (index: number) => void;
    onUpdateData: (newData: any) => void;
    onReset: () => void;
}

export default function ProgramPanel({
    fullData,
    activeCycle,
    activeSessionIdx,
    user,
    onSelectCycle,
    onSelectSession,
    onUpdateData,
    onReset
}: ProgramPanelProps) {
    const [activeTab, setActiveTab] = useState<'active' | 'library' | 'create'>('active');
    const [isEditing, setIsEditing] = useState(false);

    // Library & AI State
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supabase = createClient();

    // Access cycle directly by index properties
    const currentCycleData = fullData?.[activeCycle];

    useEffect(() => {
        if (activeTab === 'library') {
            fetchPrograms();
        }
    }, [activeTab]);

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
            let body: any = { prompt };

            if (selectedFile) {
                const reader = new FileReader();
                reader.readAsDataURL(selectedFile);
                reader.onload = async () => {
                    const base64 = reader.result as string;
                    body.image = base64;
                    await submitGeneration(body);
                };
            } else {
                await submitGeneration(body);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la génération");
            setIsGenerating(false);
        }
    };

    const submitGeneration = async (body: any) => {
        const res = await fetch('/api/generate-program', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('Generation failed');
        const data = await res.json();
        setGeneratedProgram(data);
        setIsGenerating(false);
    };

    const handleSelectProgram = async (prog: any) => {
        setLoading(true);
        if (user) {
            await supabase.from('programs').update({ is_active: false }).eq('user_id', user.id);
            await supabase.from('programs').update({ is_active: true }).eq('id', prog.id);
        }

        // Normalize data to Record<number, Cycle>
        let dataToSet = prog.content;
        if (dataToSet.sessions && Array.isArray(dataToSet.sessions)) {
            dataToSet = {
                1: {
                    name: dataToSet.title,
                    sessions: dataToSet.sessions
                }
            };
        }

        onUpdateData(dataToSet);
        setActiveTab('active');
        setActiveCycle(1); // Default to cycle 1
        setLoading(false);
    };

    const handleSaveAndSelect = async () => {
        if (!generatedProgram) return;

        if (user) {
            await supabase.from('programs').update({ is_active: false }).eq('user_id', user.id);
            const { data, error } = await supabase.from('programs').insert({
                user_id: user.id,
                title: generatedProgram.title || 'Nouveau Programme',
                description: generatedProgram.description || 'Généré par IA',
                content: generatedProgram, // Store as is (Format A)
                is_active: true
            }).select().single();

            if (!error && data) {
                // Normalize for State
                const dataToSet = {
                    1: {
                        name: generatedProgram.title,
                        sessions: generatedProgram.sessions
                    }
                };
                onUpdateData(dataToSet);
                setActiveTab('active');
                setActiveCycle(1);
            } else {
                alert("Erreur sauvegarde DB");
            }
        } else {
            // Normalize for State
            const dataToSet = {
                1: {
                    name: generatedProgram.title,
                    sessions: generatedProgram.sessions
                }
            };
            onUpdateData(dataToSet);
            setActiveTab('active');
            setActiveCycle(1);
        }
        setGeneratedProgram(null);
        setPrompt('');
        setFilePreview(null);
    };

    // Need helper to set active cycle locally if needed, but ProgramPanel props control that.
    // We can't change 'activeCycle' prop from here directly except via onSelectCycle.
    const setActiveCycle = (idx: number) => onSelectCycle(idx);

    const handleReorder = (newSessions: any[]) => {
        if (!fullData || !currentCycleData) return;

        const newData = { ...fullData };
        newData[activeCycle] = {
            ...currentCycleData,
            sessions: newSessions
        };
        onUpdateData(newData);
    };

    const suggestions = [
        "💪 Prise de Masse (4 jours)",
        "🔥 Sèche Express (30 min)",
        "🏠 Poids du Corps (Sans matériel)",
        "🏋️‍♂️ Force & Powerlifting",
        "🧘‍♂️ Souplesse & Mobilité",
        "🏃‍♂️ Cardio & Endurance"
    ];

    return (
        <div className="max-w-md mx-auto p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {activeTab === 'library' && <BookOpen className="text-indigo-600" />}
                    {activeTab === 'create' && <Sparkles className="text-indigo-600" />}
                    {activeTab === 'active' && <Dumbbell className="text-indigo-600" />}

                    {activeTab === 'library' ? 'Bibliothèque' : activeTab === 'create' ? 'Nouveau' : 'Mon Programme'}
                </h2>
                <div className="flex gap-2">
                    {activeTab === 'active' ? (
                        <>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-2 rounded-full transition-colors ${isEditing
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                    }`}
                            >
                                {isEditing ? <X size={18} /> : <Pencil size={18} />}
                            </button>
                            {!isEditing && (
                                <>
                                    <button
                                        onClick={() => setActiveTab('library')}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
                                    >
                                        <Grid size={18} />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => setActiveTab('active')}
                            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* VIEW: ACTIVE PROGRAM */}
            {activeTab === 'active' && (
                <>
                    {/* Current Cycle Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-indigo-200 font-bold text-xs uppercase tracking-wider mb-1">Cycle Actuel</div>
                                <h3 className="text-2xl font-black">{currentCycleData?.name || "Chargement..."}</h3>
                            </div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                {currentCycleData?.sessions?.length} Séances
                            </span>
                        </div>

                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                            {fullData && Object.keys(fullData).map((key: string) => {
                                const idx = parseInt(key);
                                const cycle = fullData[idx];
                                if (!cycle) return null;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveCycle(idx)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeCycle === idx
                                            ? 'bg-white text-indigo-700 shadow-lg'
                                            : 'bg-white/10 text-indigo-200 hover:bg-white/20'
                                            }`}
                                    >
                                        {cycle.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sessions List */}
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            Séances du Cycle {isEditing && <span className="text-xs font-normal text-indigo-500 ml-2 animate-pulse">(Glisser pour réorganiser)</span>}
                        </h3>

                        {isEditing ? (
                            <Reorder.Group axis="y" values={currentCycleData?.sessions || []} onReorder={handleReorder} className="space-y-3">
                                {currentCycleData?.sessions?.map((session: any) => (
                                    <Reorder.Item key={session.id || session.name} value={session}>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-indigo-300 shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-4">
                                            <GripVertical className="text-slate-400 shrink-0" />
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200">{session.name}</h4>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                    {session.exercises.length} exercices
                                                </div>
                                            </div>
                                        </div>
                                    </Reorder.Item>
                                ))}
                            </Reorder.Group>
                        ) : (
                            <div className="space-y-3">
                                {currentCycleData?.sessions?.map((session: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onClick={() => onSelectSession(idx)}
                                        className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all cursor-pointer ${idx === activeSessionIdx
                                            ? 'border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className={`font-bold ${idx === activeSessionIdx ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {session.name}
                                            </h4>
                                            {idx === activeSessionIdx && (
                                                <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                                    En cours
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                            {session.exercises.map((ex: any) => ex.name).join(', ')}
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <button className={`text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all ${idx === activeSessionIdx ? 'text-indigo-600' : 'text-slate-400'
                                                }`}>
                                                {idx === activeSessionIdx ? 'Reprendre' : 'Sélectionner'} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* VIEW: LIBRARY */}
            {activeTab === 'library' && (
                <div className="space-y-4">
                    <button
                        onClick={() => setActiveTab('create')}
                        className="w-full py-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-600 font-bold flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                    >
                        <Plus size={24} />
                        Créer un nouveau programme (IA)
                    </button>

                    <h3 className="font-bold text-slate-600 text-sm mt-6 mb-2">Mes Programmes Enregistrés</h3>

                    {loading ? (
                        <div className="text-center py-8 text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-2" /> Chargement...
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Reference Program - Static */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-60">
                                <div className="flex justify-between">
                                    <h4 className="font-bold text-slate-700">Programme Velox (Défaut)</h4>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Le programme original.</p>
                            </div>

                            {programs.map((prog) => (
                                <div key={prog.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group relative">
                                    <div onClick={() => handleSelectProgram(prog)} className="cursor-pointer">
                                        <h4 className="font-bold text-indigo-900">{prog.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prog.description}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {new Date(prog.created_at).toLocaleDateString()}
                                            </span>
                                            {prog.is_active && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold">Actif</span>}
                                        </div>
                                    </div>
                                    {!prog.is_active && (
                                        <button className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* VIEW: CREATE (IA) */}
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
                                placeholder="Décrivez votre objectif (ex: 'Programme PPL 4 jours focus épaules')"
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
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 animate-in zoom-in-95 duration-300">
                                <div className="flex justify-center mb-4">
                                    <div className="bg-green-100 text-green-600 p-3 rounded-full">
                                        <CheckCircle2 size={32} />
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg text-slate-800 text-center">{generatedProgram.title}</h3>
                                <p className="text-sm text-slate-500 mb-2 text-center">{generatedProgram.description}</p>
                                <div className="flex justify-center gap-2 text-xs mt-4">
                                    <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full">
                                        {Object.keys(generatedProgram).length} Cycles
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setGeneratedProgram(null)}
                                    className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-xl"
                                >
                                    Refaire
                                </button>
                                <button
                                    onClick={handleSaveAndSelect}
                                    className="flex-[2] py-3 font-bold text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200"
                                >
                                    Valider & Utiliser
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
