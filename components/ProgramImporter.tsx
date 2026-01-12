'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, CheckCircle2, AlertCircle, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Program } from '@/types';

export default function ProgramImporter() {
    const [inputVal, setInputVal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState<Program | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const supabase = createClient();

    const handleGenerate = async () => {
        if (!inputVal.trim()) return;

        setIsGenerating(true);
        setError(null);
        setGeneratedProgram(null);

        try {
            const response = await fetch('/api/generate-program', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: inputVal }),
            });

            if (!response.ok) throw new Error('Failed to generate program');

            const data = await response.json();
            setGeneratedProgram(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!generatedProgram) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error('Vous devez être connecté pour sauvegarder.');
            }

            const { error } = await supabase
                .from('programs')
                .insert({
                    user_id: user.id,
                    title: generatedProgram.title,
                    description: generatedProgram.description,
                    content: generatedProgram,
                    is_active: true // Active by default for now
                });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Programme sauvegardé avec succès !' });
            setInputVal('');
            setGeneratedProgram(null);
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur de sauvegarde' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Sparkles size={24} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 italic">IA Generator</h2>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <textarea
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Collez votre programme ici (PDF copié, texte, notes...) ou demandez à l'IA : 'Fais-moi un programme PPL sur 3 jours'"
                        className="w-full h-40 p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none text-slate-700 font-medium placeholder:text-slate-400"
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                        Powered by Gemini 1.5 Flash
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !inputVal.trim()}
                    className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="animate-spin" /> Analyse en cours...
                        </>
                    ) : (
                        <>
                            <Sparkles size={20} /> Générer le Programme Interactif
                        </>
                    )}
                </button>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                        <AlertCircle size={20} />
                        <p className="font-bold text-sm">{error}</p>
                    </div>
                )}

                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="font-bold text-sm">{message.text}</p>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {generatedProgram && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-8 border-t border-slate-100 pt-6"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{generatedProgram.title}</h3>
                                <p className="text-slate-500 text-sm">{generatedProgram.description}</p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1 text-xs rounded-full">
                                {generatedProgram.sessions.length} Séances
                            </span>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto mb-4 border border-slate-100">
                            {generatedProgram.sessions.map((session, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-slate-700">{session.name}</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{session.type}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {session.exercises.length} exercices • {session.exercises.map(e => e.name).slice(0, 3).join(', ')}...
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-[0.98] transition-all border border-indigo-200 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Sauvegarder dans Velox
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
