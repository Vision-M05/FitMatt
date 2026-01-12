import React, { useState } from 'react';
import { ChevronRight, Dumbbell, Settings, Calendar, RefreshCcw, Pencil, X, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';

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
    const [isEditing, setIsEditing] = useState(false);
    // Access cycle directly by index properties
    const currentCycleData = fullData?.[activeCycle];

    const handleReorder = (newSessions: any[]) => {
        if (!fullData || !currentCycleData) return;

        const newData = { ...fullData };
        newData[activeCycle] = {
            ...currentCycleData,
            sessions: newSessions
        };
        onUpdateData(newData);
    };

    return (
        <div className="max-w-md mx-auto p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Dumbbell className="text-indigo-600" />
                    Programme
                </h2>
                <div className="flex gap-2">
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
                        <button
                            onClick={onReset}
                            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors"
                        >
                            <RefreshCcw size={18} />
                        </button>
                    )}
                </div>
            </div>

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
                                onClick={() => onSelectCycle(idx)}
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
        </div>
    );
}
