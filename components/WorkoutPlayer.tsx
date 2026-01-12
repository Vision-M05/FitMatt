'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Dumbbell, Clock, Info, Zap,
    CheckCircle2, X, ChevronRight, Trophy, Save, History,
    Calendar, Menu, BarChart3, Settings, Flame, Activity
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Program } from '@/types';
import ProgramManager from './ProgramManager';
import StatsPanel from './StatsPanel';
import type { User } from '@supabase/supabase-js';
import { useTheme } from '@/contexts/ThemeContext';
import feedback from '@/utils/haptics';

// --- CUSTOM STYLES & ANIMATIONS ---
const styles = `
  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  .animate-pop { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
  .confetti-piece { position: absolute; width: 10px; height: 10px; background: #ffd300; top: -10px; opacity: 0; }
`;

// --- SOUND UTILS ---
const playBeep = () => {
    if (typeof window === 'undefined') return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
    setTimeout(() => osc.stop(), 500);
};

// --- DATA STRUCTURE COMPLETE (Cycles 1 à 4) ---
// Note: We type this loosely to allow mixing the ref code structure with our incoming DB structure
const staticProgramData: Record<number, any> = {
    1: {
        title: "Cycle #1 (Semaines 1-4)",
        description: "Fondation et Hypertrophie.",
        sessions: [
            {
                id: "c1s1", name: "Upper (Haut)", type: "Upper",
                exercises: [
                    { name: "Développé Semi-Incliné", equip: "Haltères", sets: 5, reps: "10", tempo: "2110", rest: 90 },
                    { name: "Rowing Buste Penché", equip: "Pronation", sets: 5, reps: "12", tempo: "10X0", rest: 60, note: "Focus trapèze" },
                    { name: "Pec Deck", equip: "Machine", sets: 5, reps: "15", tempo: "10X1", rest: 60 },
                    { name: "Développé Militaire", equip: "Smith Machine", sets: 4, reps: "10", tempo: "2010", rest: 90 },
                    { name: "Élévations Latérales", equip: "Complètes", sets: 4, reps: "20", tempo: "2010", rest: 0, note: "Enchaîné" },
                    { name: "Tirage Vertical", equip: "Prise Neutre", sets: 5, reps: "10", tempo: "30X0", rest: 60 },
                    { name: "Face-Pull", equip: "Poulie", sets: 4, reps: "15", tempo: "2011", rest: 0, note: "Enchaîné" },
                    { name: "Extension Poulie Haute", equip: "Corde", sets: 4, reps: "12", tempo: "20X0", rest: 0, note: "Enchaîné" },
                    { name: "Curl Marteau", equip: "Haltères", sets: 4, reps: "10", tempo: "20X0", rest: 0, note: "Enchaîné" },
                    { name: "Bonus: Burpees Over Bar", equip: "PDC", sets: 1, reps: "100", tempo: "Rapide", rest: 0, isBonus: true },
                ]
            },
            {
                id: "c1s2", name: "Lower (Bas)", type: "Lower",
                exercises: [
                    { name: "Squat Smith Machine", equip: "Avec Cale", sets: 5, reps: "15-12-10-8", tempo: "3010", rest: 60, note: "Adapter charge à l'échec" },
                    { name: "Soulevé de Terre", equip: "Jambes Tendues", sets: 5, reps: "8", tempo: "3010", rest: 90 },
                    { name: "Leg Curl Allongé", equip: "Machine", sets: 5, reps: "15", tempo: "20X1", rest: 0, note: "Superset" },
                    { name: "Bulgarian Split Squat", equip: "Haltères", sets: 4, reps: "10", tempo: "20X0", rest: 90 },
                    { name: "Leg Extension", equip: "Machine", sets: 4, reps: "12", tempo: "10X0", rest: 0, note: "Enchaîné" },
                    { name: "Fentes Alternées", equip: "Haltères", sets: 4, reps: "20", tempo: "2010", rest: 45 },
                    { name: "Mollets Debout", equip: "Smith", sets: 5, reps: "15", tempo: "2010", rest: 45 },
                    { name: "Bonus: Box Jumps & Swing", equip: "Kettlebell", sets: 1, reps: "100", tempo: "Rapide", rest: 0, note: "10 Swings toutes les 25 reps", isBonus: true },
                ]
            },
            {
                id: "c1s3", name: "Full Body", type: "Full",
                exercises: [
                    { name: "Back Squat", equip: "Avec Cale", sets: 1, reps: "100", tempo: "20X0", rest: 180, note: "Rest Pause. Charge: 75% PDC" },
                    { name: "Développé Couché", equip: "Smith Machine", sets: 5, reps: "12", tempo: "2110", rest: 120 },
                    { name: "Overhead Press", equip: "Barre", sets: 5, reps: "10", tempo: "20X0", rest: 90 },
                    { name: "Fentes Sautées", equip: "PDC", sets: 4, reps: "20", tempo: "Rapide", rest: 0 },
                    { name: "Hyper-Extension", equip: "Banc", sets: 4, reps: "15", tempo: "21X0", rest: 0 },
                    { name: "Goblet Squat", equip: "Haltère", sets: 4, reps: "10", tempo: "2010", rest: 45 },
                    { name: "Rowing Bûcheron", equip: "Haltère", sets: 5, reps: "12", tempo: "3010", rest: 90 },
                    { name: "Tractions Supination", equip: "Barre", sets: 4, reps: "10", tempo: "10X0", rest: 0 },
                    { name: "Skull Crushers", equip: "Haltères", sets: 4, reps: "15", tempo: "2010", rest: 0 },
                    { name: "Bonus: Thrusters", equip: "Haltères", sets: 1, reps: "100", tempo: "Rapide", rest: 0, isBonus: true },
                ]
            }
        ]
    },
    2: {
        title: "Cycle #2 (Semaines 5-8)",
        description: "Augmentation de l'intensité.",
        sessions: [
            {
                id: "c2s1", name: "Upper (Haut)", type: "Upper",
                exercises: [
                    { name: "Développé Semi-Incliné", equip: "Haltères", sets: 5, reps: "12", tempo: "2110", rest: 90 },
                    { name: "Rowing Buste Penché", equip: "Pronation", sets: 5, reps: "15", tempo: "10X0", rest: 60 },
                    { name: "Pec Deck", equip: "Machine", sets: 5, reps: "20", tempo: "10X1", rest: 60 },
                    { name: "Développé Militaire", equip: "Smith Machine", sets: 5, reps: "12", tempo: "2010", rest: 0 },
                    { name: "Élévations Latérales", equip: "Complètes", sets: 5, reps: "20", tempo: "2010", rest: 90 },
                    { name: "Tirage Vertical", equip: "Prise Neutre", sets: 5, reps: "12", tempo: "30X0", rest: 60 },
                    { name: "Face-Pull", equip: "Poulie", sets: 4, reps: "15", tempo: "2011", rest: 0 },
                    { name: "Extension Poulie Haute", equip: "Corde", sets: 4, reps: "12", tempo: "20X0", rest: 0 },
                    { name: "Curl Marteau", equip: "Haltères", sets: 4, reps: "10", tempo: "20X0", rest: 0 },
                    { name: "Bonus: Burpees Over Box", equip: "Box", sets: 1, reps: "100", tempo: "Rapide", rest: 0, isBonus: true },
                ]
            },
            {
                id: "c2s2", name: "Lower (Bas)", type: "Lower",
                exercises: [
                    { name: "Squat Smith Machine", equip: "Avec Cale", sets: 5, reps: "25-15-12-10", tempo: "3010", rest: 60 },
                    { name: "S.D.T Jambes Tendues", equip: "Barre", sets: 6, reps: "10", tempo: "3010", rest: 90 },
                    { name: "Leg Curl Allongé", equip: "Machine", sets: 6, reps: "15", tempo: "20X1", rest: 0 },
                    { name: "Bulgarian Split Squat", equip: "Haltères", sets: 5, reps: "15", tempo: "20X0", rest: 90 },
                    { name: "Leg Extension", equip: "Machine", sets: 5, reps: "12", tempo: "10X0", rest: 0 },
                    { name: "Fentes Alternées", equip: "Haltères", sets: 5, reps: "20", tempo: "2010", rest: 45 },
                    { name: "Mollets Debout", equip: "Smith", sets: 5, reps: "20", tempo: "2010", rest: 45 },
                    { name: "Bonus: Box Jumps & Swing", equip: "Kettlebell", sets: 1, reps: "100", tempo: "Rapide", rest: 0, note: "20 Swings / 25 reps", isBonus: true },
                ]
            },
            {
                id: "c2s3", name: "Full Body", type: "Full",
                exercises: [
                    { name: "Back Squat", equip: "Avec Cale", sets: 1, reps: "100", tempo: "20X0", rest: 180 },
                    { name: "Développé Couché", equip: "Smith", sets: 5, reps: "15", tempo: "2110", rest: 120 },
                    { name: "Overhead Press", equip: "Barre", sets: 5, reps: "12", tempo: "20X0", rest: 90 },
                    { name: "Fentes Sautées", equip: "PDC", sets: 5, reps: "20", tempo: "Rapide", rest: 0 },
                    { name: "Hyper-Extension", equip: "Banc", sets: 5, reps: "15", tempo: "21X0", rest: 0 },
                    { name: "Goblet Squat", equip: "Haltère", sets: 5, reps: "12", tempo: "2010", rest: 45 },
                    { name: "Rowing Bûcheron", equip: "Haltère", sets: 5, reps: "15", tempo: "3010", rest: 90 },
                    { name: "Tractions Supination", equip: "Barre", sets: 4, reps: "MAX", tempo: "10X0", rest: 0 },
                    { name: "Skull Crushers", equip: "Haltères", sets: 4, reps: "20", tempo: "2010", rest: 0 },
                    { name: "Bonus: Thrusters", equip: "Haltères", sets: 1, reps: "100", tempo: "Rapide", rest: 0, isBonus: true },
                ]
            }
        ]
    },
    3: {
        title: "Cycle #3 (Semaines 9-12)",
        description: "Volume élevé & Densité.",
        sessions: [
            {
                id: "c3s1", name: "Upper (Haut)", type: "Upper",
                exercises: [
                    { name: "Développé Décliné", equip: "Haltères", sets: 4, reps: "8-12", tempo: "3010", rest: 90, note: "Banc décliné avec disque" },
                    { name: "Tirage Vertical", equip: "Grand Dorsal", sets: 4, reps: "8-12", tempo: "2011", rest: 60 },
                    { name: "Écartés Poulie Basse", equip: "Vis-à-vis", sets: 4, reps: "15", tempo: "2010", rest: 90 },
                    { name: "Rowing Buste Penché", equip: "Haltères", sets: 4, reps: "15", tempo: "2010", rest: 0 },
                    { name: "Développé Incliné Smith", equip: "Smith", sets: 3, reps: "15", tempo: "1110", rest: 30 },
                    { name: "Tirage Inversé", equip: "Poids du corps", sets: 3, reps: "15", tempo: "1011", rest: 30 },
                    { name: "Triset Épaules", equip: "Poulie/Banc", sets: 4, reps: "15/15/15", tempo: "2010", rest: 30, note: "Latérales + Y + Face-Pull" },
                    { name: "Extensions Poliquin", equip: "Poulie", sets: 4, reps: "15", tempo: "2010", rest: 30 },
                    { name: "Curl Spider", equip: "Banc Incliné", sets: 4, reps: "15", tempo: "2010", rest: 30 },
                    { name: "Circuit Final", equip: "Mixte", sets: 4, reps: "20/20/100", tempo: "Max", rest: 0, note: "Curl Press + Pompes + Mt Climber", isBonus: true },
                ]
            },
            {
                id: "c3s2", name: "Lower (Bas)", type: "Lower",
                exercises: [
                    { name: "Leg Curl", equip: "Machine", sets: 7, reps: "20/15/12/8...", tempo: "2010", rest: 45, note: "Pyramide" },
                    { name: "S.D.T Jambes Tendues", equip: "Barre", sets: 6, reps: "15/10/6...", tempo: "2110", rest: 90 },
                    { name: "Back Squat", equip: "Barre + Cale", sets: 5, reps: "10", tempo: "2010", rest: 60 },
                    { name: "Squat Haltères", equip: "Avec Cale", sets: 4, reps: "15", tempo: "2110", rest: 60 },
                    { name: "Box Jump", equip: "Box", sets: 4, reps: "20", tempo: "Explosif", rest: 0 },
                    { name: "Presse à Cuisses", equip: "Focus Fessiers", sets: 1, reps: "100", tempo: "2010", rest: 45 },
                    { name: "Bonus: Circuit", equip: "Mixte", sets: 1, reps: "100/20/20", tempo: "Max", rest: 0, note: "Burpees + Battle Rope + Clean&Press", isBonus: true },
                ]
            },
            {
                id: "c3s3", name: "Full Body", type: "Full",
                exercises: [
                    { name: "Soulevé de Terre", equip: "Classique/Sumo", sets: 5, reps: "6-10", tempo: "2010", rest: 45 },
                    { name: "Dips", equip: "Classique", sets: 5, reps: "MAX", tempo: "2010", rest: 90 },
                    { name: "Tractions Pronation", equip: "Barre", sets: 5, reps: "MAX", tempo: "2010", rest: 60 },
                    { name: "Squat Smith Machine", equip: "Machine", sets: 4, reps: "10", tempo: "2010", rest: 60 },
                    { name: "Air Squat", equip: "PDC", sets: 4, reps: "20", tempo: "Rapide", rest: 0 },
                    { name: "Tirage Horizontal", equip: "Poulie", sets: 4, reps: "15", tempo: "2011", rest: 0 },
                    { name: "Circuit Final 50", equip: "Mixte", sets: 1, reps: "50 chaque", tempo: "Max", rest: 0, note: "Overhead + Pompes + Facepull + Stepup", isBonus: true },
                ]
            }
        ]
    },
    4: {
        title: "Cycle #4 (Semaines 13-16)",
        description: "Phase Finale. Drop sets et volumes extrêmes.",
        sessions: [
            {
                id: "c4s1", name: "Upper (Haut)", type: "Upper",
                exercises: [
                    { name: "Développé Décliné", equip: "Haltères", sets: 4, reps: "14", tempo: "2110", rest: 90 },
                    { name: "Tirage Vertical", equip: "Grand Dorsal", sets: 4, reps: "14", tempo: "2011", rest: 60 },
                    { name: "Écartés Poulie Basse", equip: "Drop-set Last", sets: 4, reps: "15", tempo: "2011", rest: 90 },
                    { name: "Rowing Buste Penché", equip: "Drop-set Last", sets: 4, reps: "15", tempo: "2011", rest: 0 },
                    { name: "Développé Incliné Smith", equip: "Min de temps", sets: 1, reps: "70", tempo: "1110", rest: 0 },
                    { name: "Tirage Inversé", equip: "Min de temps", sets: 1, reps: "70", tempo: "1011", rest: 0 },
                    { name: "Triset Épaules", equip: "Drop-sets", sets: 4, reps: "15/15/15", tempo: "2010", rest: 30 },
                    { name: "Extensions Poliquin", equip: "Poulie", sets: 4, reps: "12", tempo: "2110", rest: 30 },
                    { name: "Curl Spider", equip: "Banc Incliné", sets: 4, reps: "12", tempo: "2011", rest: 30 },
                    { name: "Circuit Final", equip: "Mixte", sets: 5, reps: "20/20/100", tempo: "Max", rest: 0, isBonus: true },
                ]
            },
            {
                id: "c4s2", name: "Lower (Bas)", type: "Lower",
                exercises: [
                    { name: "Leg Curl", equip: "Machine", sets: 7, reps: "Variable", tempo: "2010", rest: 45 },
                    { name: "S.D.T Jambes Tendues", equip: "Barre", sets: 6, reps: "10", tempo: "2010", rest: 60 },
                    { name: "Back Squat", equip: "Barre + Cale", sets: 5, reps: "15", tempo: "2110", rest: 45 },
                    { name: "Squat Haltères", equip: "Avec Cale", sets: 4, reps: "10", tempo: "2010", rest: 60 },
                    { name: "Box Jump", equip: "Box", sets: 4, reps: "30", tempo: "Explosif", rest: 0 },
                    { name: "Presse à Cuisses", equip: "Focus Fessiers", sets: 1, reps: "100", tempo: "2010", rest: 0 },
                    { name: "Bonus: Circuit", equip: "Mixte", sets: 5, reps: "100/20/20", tempo: "Max", rest: 0, isBonus: true },
                ]
            },
            {
                id: "c4s3", name: "Full Body", type: "Full",
                exercises: [
                    { name: "Soulevé de Terre", equip: "Classique/Sumo", sets: 6, reps: "20-15-8...", tempo: "2010", rest: 45 },
                    { name: "Dips", equip: "Classique", sets: 1, reps: "60", tempo: "2010", rest: 0 },
                    { name: "Tractions Pronation", equip: "Barre", sets: 1, reps: "60", tempo: "2110", rest: 60 },
                    { name: "Squat Smith Machine", equip: "Machine", sets: 4, reps: "10", tempo: "2110", rest: 60 },
                    { name: "Air Squat", equip: "PDC", sets: 4, reps: "30", tempo: "Rapide", rest: 45 },
                    { name: "Tirage Horizontal", equip: "Poulie", sets: 4, reps: "15", tempo: "2010", rest: 0 },
                    { name: "Circuit Final 70", equip: "Mixte", sets: 1, reps: "70 chaque", tempo: "Max", rest: 0, isBonus: true },
                ]
            }
        ]
    }
};

// --- LOGIC HELPERS ---
const getAdjustedExercises = (exercises: any[], isExpress: boolean) => {
    if (!isExpress) return exercises;
    return exercises
        .filter(exo => !exo.isBonus)
        .map(exo => {
            let newSets = exo.sets;
            if (newSets >= 5 && (exo.name.includes('Squat') || exo.name.includes('Développé') || exo.name.includes('Terre'))) {
                newSets = 4;
            } else if (newSets > 3) {
                newSets = 3;
            }
            return { ...exo, sets: newSets, originalSets: exo.sets };
        });
};

const TempoDisplay = ({ code }: { code?: string }) => {
    if (!code || code.length !== 4 || code === "Rapide" || code === "Max") return null;
    const digits = code.split('');
    return (
        <div className="flex gap-2 text-[10px] text-slate-400 mt-2 bg-slate-50 p-1.5 rounded w-fit animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="font-mono"><strong className="text-slate-700">{digits[0]}s</strong> Desc</div>•
            <div className="font-mono"><strong className="text-slate-700">{digits[1]}s</strong> Bas</div>•
            <div className="font-mono"><strong className="text-slate-700">{digits[2]}s</strong> Mont</div>•
            <div className="font-mono"><strong className="text-slate-700">{digits[3]}s</strong> Haut</div>
        </div>
    );
};

const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {[...Array(50)].map((_, i) => (
            <div
                key={i}
                className="confetti-piece"
                style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 4)],
                    animation: `confetti ${2 + Math.random() * 3}s linear infinite`,
                    animationDelay: `${Math.random() * 2}s`
                }}
            />
        ))}
    </div>
);

// --- MAIN COMPONENT ---
const WorkoutPlayer = () => {
    const { isDark, toggleTheme } = useTheme();
    const [activeCycle, setActiveCycle] = useState(1);
    const [activeSessionIdx, setActiveSessionIdx] = useState(0);
    const [isExpressMode, setIsExpressMode] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [expressSession, setExpressSession] = useState<any>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showProgramManager, setShowProgramManager] = useState(false);
    const [showStatsPanel, setShowStatsPanel] = useState(false);

    const [nextWorkoutDate, setNextWorkoutDate] = useState<Date | null>(null);
    const [completedExos, setCompletedExos] = useState<Record<string, string[]>>({});
    const [weights, setWeights] = useState<Record<string, number>>({});
    const [fullData, setFullData] = useState(staticProgramData);

    const [timer, setTimer] = useState({ seconds: 0, initial: 0, isRunning: false, active: false });
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // Global Session Timer
    const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
    const [sessionElapsed, setSessionElapsed] = useState(0);
    const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

    // AI Weight Suggestions
    const [weightSuggestions, setWeightSuggestions] = useState<Record<string, number>>({});
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);

    const supabase = createClient();

    // Handle Express Mode Toggle with AI Optimization + Database Storage
    const handleExpressToggle = async (forceRegenerate = false) => {
        const sessionKey = `c${activeCycle}s${activeSessionIdx}`;

        if (isExpressMode && !forceRegenerate) {
            // Turn OFF express mode
            setIsExpressMode(false);
            setExpressSession(null);
            return;
        }

        // Check database first (unless forcing regeneration)
        if (!forceRegenerate && user) {
            const { data: existingExpress } = await supabase
                .from('express_sessions')
                .select('express_session')
                .eq('user_id', user.id)
                .eq('session_key', sessionKey)
                .single();

            if (existingExpress?.express_session) {
                setExpressSession(existingExpress.express_session);
                setIsExpressMode(true);
                return;
            }
        }

        // Call AI to optimize
        setIsOptimizing(true);
        try {
            const res = await fetch('/api/optimize-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session: currentSession }),
            });

            if (res.ok) {
                const optimized = await res.json();

                // Save to database (upsert - insert or update)
                if (user) {
                    await supabase
                        .from('express_sessions')
                        .upsert({
                            user_id: user.id,
                            session_key: sessionKey,
                            original_session: currentSession,
                            express_session: optimized,
                            optimization_notes: optimized.optimizationNotes || null,
                            estimated_duration: optimized.estimatedDuration || null,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'user_id,session_key' });
                }

                setExpressSession(optimized);
                setIsExpressMode(true);
            } else {
                console.error('Optimization failed, using static fallback');
                setIsExpressMode(true); // Fallback to static mode
            }
        } catch (error) {
            console.error('Express optimization error:', error);
            setIsExpressMode(true); // Fallback to static mode
        } finally {
            setIsOptimizing(false);
        }
    };

    // Load imported program from Supabase and merge it as Cycle 5 (or import)
    useEffect(() => {
        async function fetchAIProgram() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Order by created_at desc to get the latest active one if multiple exist by mistake
            const { data } = await supabase
                .from('programs')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data && data.content) {
                // We inject the AI program as "Cycle 0" or just add it to the list
                // For now, let's replace Cycle 1 for immediate feedback if user has one
                // OR strictly perform cleaner merge
                const aiProgram = data.content as Program;

                // Map AI program structure to our UI structure
                // UI expects: { title, description, sessions: [] }
                // Our DB Program matches this signature!

                setFullData(prev => ({
                    0: { ...aiProgram, title: `✨ ${aiProgram.title} (IA)` }, // ID 0 for custom
                    ...prev
                }));

                if (localStorage.getItem('velox_cycle') === null) {
                    setActiveCycle(0); // Switch to AI program by default if new
                }
            }
        }
        fetchAIProgram();
    }, []);

    // Load saved state from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedDate = localStorage.getItem('velox_next_date');
            const savedCycle = localStorage.getItem('velox_cycle');
            const savedSession = localStorage.getItem('velox_session');
            const savedWeights = localStorage.getItem('velox_weights');

            if (savedDate) setNextWorkoutDate(new Date(savedDate));
            if (savedCycle) setActiveCycle(parseInt(savedCycle));
            if (savedSession) setActiveSessionIdx(parseInt(savedSession));
            if (savedWeights) setWeights(JSON.parse(savedWeights));
        }
    }, []);

    // Auth management - Redirect to login if not authenticated
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // Redirect to login page
                window.location.href = '/login';
                return;
            }
            setUser(session.user);
        };
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                window.location.href = '/login';
            } else {
                setUser(session.user);
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const saveWeight = (exoName: string, value: string) => {
        const val = parseFloat(value);
        const newWeights = { ...weights, [exoName]: val };
        setWeights(newWeights);
        localStorage.setItem('velox_weights', JSON.stringify(newWeights));

        // Also persist to Supabase if possible
        persistWeight(exoName, val);
    };

    const persistWeight = async (exoName: string, val: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('exercise_history').insert({
            user_id: user.id,
            exercise_name: exoName,
            weight_kg: val
        });
    };

    const currentCycle = fullData[activeCycle] || fullData[1];
    const currentSession = currentCycle?.sessions[activeSessionIdx] || currentCycle.sessions[0];

    // Use AI-optimized session if available, otherwise use static fallback
    const displayedExercises = useMemo(() => {
        if (isExpressMode && expressSession?.exercises) {
            return expressSession.exercises;
        }
        return getAdjustedExercises(currentSession.exercises, isExpressMode);
    }, [currentSession, isExpressMode, expressSession]);

    const sessionKey = `c${activeCycle}s${activeSessionIdx}`;

    const toggleExercise = (exoName: string) => {
        const currentCompleted = completedExos[sessionKey] || [];
        let newCompleted;
        if (currentCompleted.includes(exoName)) {
            newCompleted = currentCompleted.filter(id => id !== exoName);
        } else {
            newCompleted = [...currentCompleted, exoName];
            feedback.check(); // Haptic feedback on check
        }
        setCompletedExos({ ...completedExos, [sessionKey]: newCompleted });
    };

    const startTimer = (seconds: number) => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setTimer({ seconds, initial: seconds, isRunning: true, active: true });

        timerIntervalRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev.seconds <= 1) {
                    playBeep();
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    return { ...prev, seconds: 0, isRunning: false };
                }
                return { ...prev, seconds: prev.seconds - 1 };
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setTimer(prev => ({ ...prev, isRunning: false, active: false }));
    };

    const addTime = (secs: number) => {
        setTimer(prev => ({ ...prev, seconds: prev.seconds + secs, initial: prev.initial + secs }));
    };

    // Session Timer Functions
    const startSessionTimer = () => {
        if (sessionStartTime) return; // Already running
        setSessionStartTime(new Date());
        sessionTimerRef.current = setInterval(() => {
            setSessionElapsed(prev => prev + 1);
        }, 1000);
    };

    const stopSessionTimer = () => {
        if (sessionTimerRef.current) {
            clearInterval(sessionTimerRef.current);
            sessionTimerRef.current = null;
        }
    };

    const resetSessionTimer = () => {
        stopSessionTimer();
        setSessionStartTime(null);
        setSessionElapsed(0);
    };

    const formatSessionTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleFinishSession = () => {
        if (!window.confirm("Valider cette séance ?")) return;

        // Calculate actual duration
        const durationMinutes = Math.round(sessionElapsed / 60);

        // Stop session timer
        stopSessionTimer();

        // Célébration
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

        const today = new Date();
        const next = new Date();
        next.setDate(today.getDate() + 2);
        setNextWorkoutDate(next);
        localStorage.setItem('velox_next_date', next.toISOString());

        setCompletedExos({ ...completedExos, [sessionKey]: [] });

        let nextIdx = activeSessionIdx + 1;
        let nextCyc = activeCycle;

        if (nextIdx >= currentCycle.sessions.length) {
            nextIdx = 0;
        }

        setTimeout(() => {
            setActiveSessionIdx(nextIdx);
            setActiveCycle(nextCyc);
            localStorage.setItem('velox_session', nextIdx.toString());
            localStorage.setItem('velox_cycle', nextCyc.toString());
            stopTimer();
            resetSessionTimer();
        }, 1000);

        // Save log to Supabase with real duration
        if (user) {
            supabase.from('workout_logs').insert({
                user_id: user.id,
                session_name: currentSession.name,
                duration_minutes: durationMinutes || 1,
                completed_at: new Date().toISOString()
            });

            // Generate AI feedback
            generateAiFeedback(durationMinutes, currentChecks.length);

            // Calculate weight suggestions for completed exercises
            calculateWeightSuggestions();
        }
    };

    // AI Feedback Generation
    const generateAiFeedback = async (duration: number, exercisesCompleted: number) => {
        try {
            // Get stats for context
            const { data: logs } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('user_id', user?.id)
                .order('completed_at', { ascending: false })
                .limit(30);

            const totalWorkouts = logs?.length || 0;

            const res = await fetch('/api/workout-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration,
                    exercisesCompleted,
                    currentStreak: totalWorkouts > 0 ? Math.min(totalWorkouts, 7) : 1,
                    totalWorkouts,
                    sessionName: currentSession.name
                })
            });

            const data = await res.json();
            setAiFeedback(data.feedback);
            setShowFeedbackModal(true);
        } catch (error) {
            console.error('AI feedback error:', error);
        }
    };

    // Calculate weight suggestions based on completed exercises
    const calculateWeightSuggestions = () => {
        const newSuggestions: Record<string, number> = {};

        displayedExercises.forEach(exo => {
            const exoKey = `${sessionKey}_${exo.name}`;
            const isCompleted = currentChecks.includes(exo.name);
            const currentWeight = weights[exoKey] || 0;

            if (isCompleted && currentWeight > 0) {
                // Suggest +2.5kg if exercise was completed
                newSuggestions[exo.name] = currentWeight + 2.5;
            }
        });

        if (Object.keys(newSuggestions).length > 0) {
            setWeightSuggestions(newSuggestions);
            localStorage.setItem('velox_weight_suggestions', JSON.stringify(newSuggestions));
        }
    };

    const currentChecks = completedExos[sessionKey] || [];
    const progress = Math.round((currentChecks.length / displayedExercises.length) * 100) || 0;

    const [status, setStatus] = useState({ text: "", color: "" });

    useEffect(() => {
        const updateStatus = () => {
            if (!nextWorkoutDate) {
                setStatus({ text: "Au travail !", color: "text-indigo-600" });
                return;
            }
            const now = new Date(); now.setHours(0, 0, 0, 0);
            const next = new Date(nextWorkoutDate); next.setHours(0, 0, 0, 0);
            const diff = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (diff <= 0) setStatus({ text: "Go Matt !", color: "text-indigo-600 animate-pulse" });
            else if (diff === 1) setStatus({ text: "Repos", color: "text-slate-400" });
            else setStatus({ text: `Dans ${diff}j`, color: "text-slate-500" });
        };
        updateStatus();
    }, [nextWorkoutDate]);

    return (
        <div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans pb-40 select-none transition-colors duration-300">
            <style>{styles}</style>
            {showConfetti && <Confetti />}

            {/* HEADER STICKY */}
            <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300">
                <div className="max-w-md mx-auto px-4 py-3">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-200">
                                <Dumbbell size={20} className="animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black italic text-slate-900 leading-none tracking-tighter">
                                    VE<span className="text-indigo-600">LOX</span>
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Session Timer */}
                            <button
                                onClick={() => sessionStartTime ? stopSessionTimer() : startSessionTimer()}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${sessionStartTime ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <Clock size={14} />
                                <span className="font-mono">{formatSessionTime(sessionElapsed)}</span>
                            </button>

                            <div className={`px-2 py-1 rounded-md text-xs font-bold bg-slate-100 ${status.color || 'opacity-0'}`}>
                                {status.text}
                            </div>

                            <button
                                onClick={() => handleExpressToggle()}
                                onContextMenu={(e) => { e.preventDefault(); handleExpressToggle(true); }}
                                disabled={isOptimizing}
                                title={isExpressMode ? "Désactiver Express (clic droit = régénérer)" : "Activer mode Express IA"}
                                className={`p-2 rounded-full transition-all duration-300 active:scale-90 ${isExpressMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-12' : 'bg-slate-100 text-slate-400'} ${isOptimizing ? 'animate-pulse' : ''}`}
                            >
                                {isOptimizing ? (
                                    <div className="w-[18px] h-[18px] border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Zap size={18} fill={isExpressMode ? "currentColor" : "none"} />
                                )}
                            </button>

                            {/* Stats Button */}
                            <button
                                onClick={() => setShowStatsPanel(true)}
                                className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-amber-100 hover:text-amber-600 transition-all"
                                title="Statistiques"
                            >
                                <BarChart3 size={18} />
                            </button>

                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:rotate-90 transition-all duration-300"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-2 animate-slide-up">
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{currentCycle.title || `Cycle ${activeCycle}`}</div>
                            <div className="text-lg font-bold text-slate-800 leading-tight">{currentSession.name}</div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-indigo-600 transition-all duration-500">{progress}%</span>
                        </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-indigo-600 h-full transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {showSettings && (
                    <div className="bg-slate-50 border-t border-slate-200 animate-slide-up">
                        <div className="max-w-md mx-auto p-4 space-y-4">
                            {/* AI BUTTON */}
                            <div>
                                <button
                                    onClick={() => { setShowProgramManager(true); setShowSettings(false); }}
                                    className="w-full py-3 rounded-lg font-bold text-white bg-slate-900 shadow-md shadow-slate-200 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors dark:bg-slate-700"
                                >
                                    <Menu size={18} /> Gérer mes Programmes (IA)
                                </button>
                            </div>

                            {/* DARK MODE TOGGLE */}
                            <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        {isDark ? '🌙' : '☀️'}
                                    </div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">Mode {isDark ? 'Sombre' : 'Clair'}</span>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`w-14 h-8 rounded-full transition-all duration-300 ${isDark ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isDark ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Changer de Cycle</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {Object.keys(fullData).map(k => {
                                        const c = parseInt(k);
                                        const isAI = c === 0;
                                        return (
                                            <button
                                                key={c}
                                                onClick={() => { setActiveCycle(c); setActiveSessionIdx(0); setShowSettings(false); }}
                                                className={`py-2 rounded-lg font-bold text-sm border transition-all active:scale-95 ${activeCycle === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                            >
                                                {isAI ? 'IA' : `C${c}`}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Changer de Séance</h3>
                                <div className="flex flex-col gap-2">
                                    {currentCycle.sessions.map((sess: any, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setActiveSessionIdx(idx); setShowSettings(false); }}
                                            className={`px-4 py-3 rounded-lg text-left text-sm font-bold border flex justify-between items-center transition-all active:scale-[0.98] ${activeSessionIdx === idx ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'bg-white border-slate-200'}`}
                                        >
                                            <span>{sess.name}</span>
                                            {activeSessionIdx === idx && <CheckCircle2 size={16} className="text-indigo-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* USER INFO & LOGOUT */}
                            {user && (
                                <div className="pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400 font-medium">Connecté</div>
                                                <div className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{user.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                await supabase.auth.signOut();
                                                window.location.href = '/login';
                                            }}
                                            className="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 text-xs font-bold rounded-lg transition-colors"
                                        >
                                            Déconnexion
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* EXERCISES LIST */}
            <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
                {displayedExercises.map((exo: any, idx: number) => {
                    const isDone = currentChecks.includes(exo.name);
                    const savedWeight = weights[exo.name];

                    return (
                        <div
                            key={idx}
                            className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-500 animate-slide-up active:scale-[0.99] ${isDone ? 'opacity-60 bg-slate-50' : ''}`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            {isExpressMode && exo.originalSets > exo.sets && (
                                <div className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-4 py-1 flex items-center gap-1">
                                    <Zap size={10} fill="currentColor" /> Mode 1h (Sets réduits)
                                </div>
                            )}

                            <div className="p-4">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex gap-3 flex-1">
                                        <button
                                            onClick={() => toggleExercise(exo.name)}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 mt-0.5 ${isDone ? 'bg-green-500 border-green-500 text-white animate-pop' : 'border-slate-200 text-transparent hover:border-green-400'}`}
                                        >
                                            <CheckCircle2 size={18} />
                                        </button>

                                        <div>
                                            <h3 className={`font-bold text-lg leading-tight transition-colors ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                                {exo.name}
                                            </h3>
                                            <p className="text-xs text-slate-400 font-medium">{exo.equip}</p>
                                        </div>
                                    </div>

                                    {exo.rest > 0 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startTimer(exo.rest); }}
                                            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-90 shrink-0"
                                        >
                                            <Clock size={14} className={timer.active ? 'animate-spin' : ''} /> {exo.rest}s
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4 flex items-end justify-between bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex gap-4">
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold text-center">Séries</div>
                                            <div className="text-xl font-black text-slate-800 text-center">{exo.sets}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold text-center">Reps</div>
                                            <div className="text-xl font-black text-slate-800 text-center">{exo.reps}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        {savedWeight && (
                                            <div className="text-[10px] text-indigo-500 font-bold mb-1 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded animate-pop">
                                                <History size={10} /> {savedWeight}kg
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                placeholder="--"
                                                className="w-12 text-right font-bold outline-none text-slate-900 placeholder:text-slate-300"
                                                value={weights[exo.name] || ''}
                                                onChange={(e) => saveWeight(exo.name, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-xs text-slate-400 font-bold pr-1">kg</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-1 mt-1">
                                    <TempoDisplay code={exo.tempo} />
                                    {exo.note && (
                                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 p-2 rounded flex gap-2 items-start animate-slide-up" style={{ animationDelay: '0.3s' }}>
                                            <Info size={14} className="mt-0.5 shrink-0" />
                                            <span className="font-medium">{exo.note}</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FLOATING TIMER OVERLAY */}
            {timer.active && (
                <div className="fixed bottom-24 left-4 right-4 bg-slate-900/90 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl z-50 animate-slide-up border border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative w-14 h-14">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                    <circle
                                        cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-indigo-500 transition-all duration-1000 ease-linear"
                                        strokeDasharray={150}
                                        strokeDashoffset={150 - (150 * timer.seconds) / timer.initial}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-lg animate-pulse">
                                    {timer.seconds}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-200">Repos en cours</div>
                                <div className="text-xs text-slate-400">Respire, détends-toi.</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => addTime(30)} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-90">+30s</button>
                            <button onClick={stopTimer} className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-3 rounded-xl border border-slate-700 transition-all active:scale-90">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM NAV BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 pb-8 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto flex gap-3">
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="text-[10px] text-slate-400 uppercase font-bold text-center mb-0.5">Durée estimée</div>
                        <div className="text-center font-black text-xl text-slate-800 leading-none">
                            {isExpressMode ? '~55m' : '~1h25'}
                        </div>
                    </div>
                    <button
                        onClick={handleFinishSession}
                        disabled={progress < 20}
                        className={`flex-[2] rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg py-3.5 ${progress >= 90 ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 text-white shadow-indigo-500/30' : 'bg-slate-900 text-white shadow-slate-900/20'}`}
                    >
                        {progress >= 90 ? <Trophy size={20} className="animate-bounce" /> : <Save size={20} />}
                        {progress >= 90 ? "Valider la séance !" : "Enregistrer"}
                    </button>
                </div>
            </div>

            {/* PROGRAM MANAGER MODAL */}
            <ProgramManager
                isOpen={showProgramManager}
                onClose={() => setShowProgramManager(false)}
                user={user}
                onSelectProgram={(prog, id) => {
                    if (id === 'reference') {
                        setFullData(staticProgramData);
                        setActiveCycle(1);
                    } else {
                        // Add as Cycle 0
                        setFullData(prev => ({
                            ...prev,
                            0: { ...prog, title: prog.title }
                        }));
                        setActiveCycle(0);
                    }
                    setActiveSessionIdx(0);
                    // Persist valid selection
                    localStorage.setItem('velox_cycle', id === 'reference' ? '1' : '0');
                }}
                currentProgramId={activeCycle === 0 ? 'custom' : 'reference'}
            />

            {/* STATS PANEL */}
            <StatsPanel
                isOpen={showStatsPanel}
                onClose={() => setShowStatsPanel(false)}
                user={user}
            />

            {/* AI FEEDBACK MODAL */}
            {showFeedbackModal && aiFeedback && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-bounce-in">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">Séance validée !</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">{aiFeedback}</p>

                        {Object.keys(weightSuggestions).length > 0 && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 mb-4 text-left">
                                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-2">💪 Suggestions pour la prochaine fois :</div>
                                {Object.entries(weightSuggestions).slice(0, 3).map(([name, weight]) => (
                                    <div key={name} className="text-xs text-slate-600 dark:text-slate-400">
                                        {name}: <span className="font-bold text-emerald-600">+2.5kg → {weight}kg</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowFeedbackModal(false)}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            Continuer 🚀
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default WorkoutPlayer;
