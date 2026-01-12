'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Calculator, TrendingUp, Activity, Flame } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AnalyticsPanelProps {
    user: User | null;
}

interface WorkoutLog {
    id: string;
    completed_at: string;
    duration_minutes: number;
    session_name: string;
    exercises?: { name: string; sets: number; reps: string | number; weight: number }[];
}

export default function AnalyticsPanel({ user }: AnalyticsPanelProps) {
    const [logs, setLogs] = useState<WorkoutLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [oneRMWeight, setOneRMWeight] = useState('');
    const [oneRMReps, setOneRMReps] = useState('');
    const [calculated1RM, setCalculated1RM] = useState<number | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (user) fetchLogs();
    }, [user]);

    const fetchLogs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('user_id', user?.id)
            .order('completed_at', { ascending: false })
            .limit(90);

        if (data) setLogs(data);
        setLoading(false);
    };

    const calculate1RM = () => {
        const weight = parseFloat(oneRMWeight);
        const reps = parseFloat(oneRMReps);
        if (weight > 0 && reps > 0 && reps <= 12) {
            // Epley formula
            const result = weight * (1 + reps / 30);
            setCalculated1RM(Math.round(result * 10) / 10);
        }
    };

    const calculateTonnage = (log: WorkoutLog) => {
        if (!log.exercises || !Array.isArray(log.exercises)) return 0;
        return log.exercises.reduce((acc, exo) => {
            const reps = typeof exo.reps === 'string'
                ? parseInt(exo.reps.split('-')[0]) || 10
                : exo.reps;
            return acc + (exo.sets * reps * exo.weight);
        }, 0);
    };

    // Plateau Detection Logic
    const detectPlateaus = () => {
        const exerciseHistory: Record<string, { date: string; maxWeight: number }[]> = {};

        // 1. Group by exercise
        logs.forEach(log => {
            if (!log.exercises) return; // Skip logs without detailed data
            log.exercises.forEach(exo => {
                if (!exerciseHistory[exo.name]) exerciseHistory[exo.name] = [];
                // Find max weight for this session
                exerciseHistory[exo.name].push({
                    date: log.completed_at,
                    maxWeight: exo.weight
                });
            });
        });

        const insights: { name: string; status: 'stagnant' | 'progress'; trend: string }[] = [];

        // 2. Analyze trends (last 3 detected sessions)
        Object.entries(exerciseHistory).forEach(([name, history]) => {
            // Sort by date ascending
            history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Need at least 3 sessions to detect trend
            if (history.length < 3) return;

            const recent = history.slice(-3); // Last 3
            const startWeight = recent[0].maxWeight;
            const endWeight = recent[recent.length - 1].maxWeight;

            const progressDiff = endWeight - startWeight;
            const progressPct = startWeight > 0 ? (progressDiff / startWeight) * 100 : 0;

            if (progressDiff <= 0 && startWeight > 0) {
                insights.push({
                    name,
                    status: 'stagnant',
                    trend: `${endWeight}kg (0%)`
                });
            } else if (progressDiff > 0) {
                insights.push({
                    name,
                    status: 'progress',
                    trend: `+${progressPct.toFixed(1)}%`
                });
            }
        });

        return insights.slice(0, 4); // Top 4 insights
    };

    // Weekly Volume Chart (Last 4 Weeks)
    const generateVolumeChart = () => {
        const weeks = [];
        const now = new Date();

        for (let i = 3; i >= 0; i--) {
            const start = new Date(now);
            start.setDate(now.getDate() - (i + 1) * 7);
            start.setHours(0, 0, 0, 0);

            const end = new Date(now);
            end.setDate(now.getDate() - i * 7);
            end.setHours(0, 0, 0, 0);

            const startStr = start.toISOString();
            const endStr = end.toISOString();

            const weekLogs = logs.filter(l => l.completed_at >= startStr && l.completed_at < endStr);
            const volume = weekLogs.reduce((sum, log) => sum + calculateTonnage(log), 0);
            weeks.push({ label: `S-${i}`, volume });
        }
        return weeks;
    };

    // Generate heatmap data for last 12 weeks
    const generateHeatmap = () => {
        const weeks: { date: Date; count: number }[][] = [];
        const today = new Date();

        for (let w = 11; w >= 0; w--) {
            const week: { date: Date; count: number }[] = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(today);
                date.setDate(date.getDate() - (w * 7 + (6 - d)));
                const dateStr = date.toISOString().split('T')[0];
                const count = logs.filter(log =>
                    log.completed_at.startsWith(dateStr)
                ).length;
                week.push({ date, count });
            }
            weeks.push(week);
        }
        return weeks;
    };

    const heatmap = generateHeatmap();
    const volumeChart = generateVolumeChart();
    const maxVolume = Math.max(...volumeChart.map(w => w.volume), 1); // Avoid div by 0

    const totalVolume = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const thisWeekLogs = logs.filter(log => {
        const logDate = new Date(log.completed_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate >= weekAgo;
    });

    // Tonnage cette semaine
    const weeklyTonnage = thisWeekLogs.reduce((sum, log) => sum + calculateTonnage(log), 0);
    const insights = detectPlateaus();

    return (
        <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Activity} label="Cette Semaine" value={`${thisWeekLogs.length}`} unit="séances" color="from-indigo-500 to-violet-600" />
                <StatCard icon={TrendingUp} label="Volume Tonnage" value={`${(weeklyTonnage / 1000).toFixed(1)}k`} unit="kg" color="from-pink-500 to-rose-500" />
            </div>

            {/* Performance Insights */}
            {insights.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                    {insights.map((insight, idx) => (
                        <div key={idx} className={`bg-white dark:bg-slate-800 p-3 rounded-2xl border ${insight.status === 'stagnant' ? 'border-orange-200 dark:border-orange-900/50' : 'border-emerald-200 dark:border-emerald-900/50'} shadow-sm flex flex-col justify-between`}>
                            <div className="flex justify-between items-start mb-1">
                                <div className={`p-1.5 rounded-lg ${insight.status === 'stagnant' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {insight.status === 'stagnant' ? <Flame size={14} /> : <TrendingUp size={14} />}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insight.status === 'stagnant' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {insight.status === 'stagnant' ? 'Plateau' : 'Progression'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mb-0.5">{insight.name}</div>
                                <div className="text-lg font-black text-slate-900 dark:text-white">{insight.trend}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Heatmap */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-indigo-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Activité (12 semaines)</h3>
                </div>

                {loading ? (
                    <div className="h-24 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="flex gap-1 overflow-x-auto">
                        {heatmap.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-1">
                                {week.map((day, di) => (
                                    <div
                                        key={di}
                                        className={`w-3 h-3 rounded-sm transition-all ${day.count === 0
                                            ? 'bg-slate-100 dark:bg-slate-700'
                                            : day.count === 1
                                                ? 'bg-emerald-300'
                                                : day.count === 2
                                                    ? 'bg-emerald-500'
                                                    : 'bg-emerald-700'
                                            }`}
                                        title={`${day.date.toLocaleDateString()}: ${day.count} séance(s)`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <span>Moins</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-700" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                        <div className="w-3 h-3 rounded-sm bg-emerald-700" />
                    </div>
                    <span>Plus</span>
                </div>
            </div>

            {/* Volume Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={18} className="text-pink-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Volume Hebdo (Tonnage)</h3>
                </div>
                <div className="h-32 flex items-end justify-between gap-2 px-2">
                    {volumeChart.map((week, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                            <div className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {(week.volume / 1000).toFixed(1)}k
                            </div>
                            <div
                                className="w-full bg-gradient-to-t from-pink-500 to-rose-400 rounded-t-lg transition-all duration-1000 ease-out hover:opacity-80"
                                style={{ height: `${(week.volume / maxVolume) * 100}%`, minHeight: '4px' }}
                            />
                            <div className="text-[10px] text-slate-400 font-bold">{week.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 1RM Calculator */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={18} className="text-indigo-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Calculateur 1RM</h3>
                </div>

                <div className="flex gap-2 mb-3">
                    <input
                        type="number"
                        placeholder="Poids (kg)"
                        value={oneRMWeight}
                        onChange={(e) => setOneRMWeight(e.target.value)}
                        className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-white"
                    />
                    <input
                        type="number"
                        placeholder="Reps"
                        value={oneRMReps}
                        onChange={(e) => setOneRMReps(e.target.value)}
                        className="w-20 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 dark:text-white"
                    />
                    <button
                        onClick={calculate1RM}
                        className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                    >
                        =
                    </button>
                </div>

                {calculated1RM && (
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl p-3 text-center text-white animate-bounce-in">
                        <div className="text-xs opacity-80">Ton 1RM estimé</div>
                        <div className="text-2xl font-black">{calculated1RM} kg</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, unit, color }: { icon: typeof Activity; label: string; value: string; unit: string; color: string }) {
    return (
        <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white`}>
            <Icon size={20} className="opacity-80 mb-2" />
            <div className="text-2xl font-black">{value}</div>
            <div className="text-xs opacity-80">{unit}</div>
            <div className="text-xs font-bold mt-1">{label}</div>
        </div>
    );
}
