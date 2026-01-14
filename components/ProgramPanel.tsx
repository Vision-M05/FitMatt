import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronRight, Dumbbell, Calendar, RefreshCcw, Pencil, X, GripVertical,
    Sparkles, Upload, FileText, CheckCircle2, Trash2, Loader2, Plus, Grid, ArrowLeft, BookOpen, Play
} from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { calculateSessionDuration } from '@/utils/duration';

interface ProgramPanelProps {
    fullData: any;
    activeCycle: number;
    activeSessionIdx: number;
    user: any;
    initialTab?: 'active' | 'library' | 'create';
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
    initialTab = 'active',
    onSelectCycle,
    onSelectSession,
    onUpdateData,
    onReset
}: ProgramPanelProps) {
    const [activeTab, setActiveTab] = useState<'active' | 'library' | 'create'>(initialTab);
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

    const handleDeleteProgram = async (programId: string, programTitle: string) => {
        if (!user) return;

        const confirmed = confirm(`Supprimer le programme "${programTitle}" ?\n\nCette action est irréversible.`);
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('programs')
                .delete()
                .eq('id', programId)
                .eq('user_id', user.id);

            if (error) {
                console.error('Delete error:', error);
                alert('Erreur lors de la suppression');
                return;
            }

            // Remove from local state
            setPrograms(prev => prev.filter(p => p.id !== programId));
        } catch (err) {
            console.error('Delete error:', err);
            alert('Erreur lors de la suppression');
        }
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
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {activeTab === 'library' && <BookOpen className="text-indigo-600" />}
                        {activeTab === 'create' && <Sparkles className="text-indigo-600" />}
                        {activeTab === 'active' && <Dumbbell className="text-indigo-600" />}
                        {activeTab === 'library' ? 'Création' : activeTab === 'create' ? 'Créer' : 'Programme'}
                    </h2>
                    {activeTab === 'active' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Choisis ton cycle et ta séance</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {(activeTab === 'active' || activeTab === 'library') && (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isEditing
                                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 hover:bg-slate-200'
                                }`}
                        >
                            {isEditing ? <X size={14} /> : <Pencil size={14} />}
                            {isEditing ? 'Fermer' : 'Modifier'}
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
                                <div className="text-indigo-200 font-bold text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                                    {activeCycle === 0 && <Sparkles size={12} />}
                                    Cycle Actuel
                                </div>
                                <h3 className="text-2xl font-black">
                                    {currentCycleData?.name || currentCycleData?.title || "Mon Programme"}
                                </h3>
                            </div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                {currentCycleData?.sessions?.length || 0} Séance{(currentCycleData?.sessions?.length || 0) > 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
                            {fullData && Object.keys(fullData).map((key: string) => {
                                const idx = parseInt(key);
                                const cycle = fullData[idx];
                                if (!cycle) return null;
                                const isAI = idx === 0;
                                const cycleName = cycle.name || cycle.title || `Cycle ${idx}`;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveCycle(idx)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeCycle === idx
                                            ? 'bg-white text-indigo-700 shadow-lg scale-105'
                                            : 'bg-white/10 text-indigo-200 hover:bg-white/20 active:scale-95'
                                            }`}
                                    >
                                        {isAI && <Sparkles size={14} />}
                                        {isAI ? 'IA' : cycleName}
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
                                        className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98] ${idx === activeSessionIdx
                                            ? 'border-2 border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1 min-w-0">
                                                {/* Header: Day + Count */}
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">
                                                        Jour {idx + 1}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        ⏱️ {calculateSessionDuration(session)} min • {session.exercises.length} exos
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h4 className={`text-base font-bold truncate mb-1.5 ${idx === activeSessionIdx ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {session.name}
                                                </h4>

                                                {/* Exercise Preview */}
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                    <Dumbbell size={12} className="shrink-0 opacity-50" />
                                                    <span className="truncate opacity-80">
                                                        {session.exercises.slice(0, 3).map((ex: any) => ex.name).join(' • ')}
                                                        {session.exercises.length > 3 && ' ...'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right Action */}
                                            {idx === activeSessionIdx ? (
                                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ml-3 shrink-0 animate-pop">
                                                    <Play size={14} fill="currentColor" />
                                                </div>
                                            ) : (
                                                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 ml-3 shrink-0" />
                                            )}
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
                <div className="space-y-6">
                    {/* Create Button - Prominent */}
                    <button
                        onClick={() => setActiveTab('create')}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center gap-3 hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Sparkles size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-base">Créer avec l'IA</div>
                            <div className="text-xs text-indigo-200 font-normal">Génère ton programme personnalisé</div>
                        </div>
                    </button>

                    {/* Section Title */}
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                            <BookOpen size={14} className="text-slate-500" />
                        </div>
                        <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">Mes Programmes</h3>
                        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 ml-2" />
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-3" size={28} />
                            <span className="text-sm">Chargement...</span>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Reference Program - Static */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 opacity-60">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                                        <Dumbbell size={18} className="text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-600 dark:text-slate-400">Programme Velox</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Programme par défaut</p>
                                    </div>
                                </div>
                            </div>

                            {programs.map((prog) => (
                                <div key={prog.id} className="relative overflow-hidden rounded-2xl">
                                    {/* Delete Button Background (Swipe) */}
                                    {!prog.is_active && !isEditing && (
                                        <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center rounded-r-2xl">
                                            <Trash2 size={20} className="text-white" />
                                        </div>
                                    )}

                                    {/* Swipeable Card */}
                                    <motion.div
                                        drag={!prog.is_active && !isEditing ? "x" : false}
                                        dragConstraints={{ left: -80, right: 0 }}
                                        dragElastic={0.1}
                                        onDragEnd={(_, info) => {
                                            if (info.offset.x < -60) {
                                                handleDeleteProgram(prog.id, prog.title);
                                            }
                                        }}
                                        onClick={() => !isEditing && handleSelectProgram(prog)}
                                        className={`bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 cursor-pointer relative ${prog.is_active
                                            ? 'border-indigo-500 shadow-md shadow-indigo-500/10'
                                            : 'border-slate-100 dark:border-slate-700'
                                            }`}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${prog.is_active
                                                ? 'bg-indigo-100 dark:bg-indigo-900/50'
                                                : 'bg-slate-100 dark:bg-slate-700'
                                                }`}>
                                                <Sparkles size={18} className={prog.is_active ? 'text-indigo-600' : 'text-slate-400'} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-bold truncate ${prog.is_active ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {prog.title}
                                                    </h4>
                                                    {prog.is_active && (
                                                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                                                            ✓ Actif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{prog.description}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    <span className="text-[11px] text-slate-400">
                                                        {new Date(prog.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 ml-2 border-l border-slate-300 pl-2">
                                                        ~{Math.round(prog.content?.sessions?.reduce((acc: number, s: any) => acc + calculateSessionDuration(s), 0) / (prog.content?.sessions?.length || 1)) || 45} min
                                                    </span>
                                                    {!prog.is_active && !isEditing && (
                                                        <span className="text-[10px] text-slate-300 ml-auto">← Glisser pour supprimer</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Explicit Delete Button when Editing */}
                                            {isEditing && !prog.is_active ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteProgram(prog.id, prog.title); }}
                                                    className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 hover:bg-red-200 dark:hover:bg-red-900/50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 shrink-0" />
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            ))}

                            {programs.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <BookOpen size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium">Aucun programme</p>
                                    <p className="text-xs mt-1">Crée ton premier programme avec l'IA !</p>
                                </div>
                            )}
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
