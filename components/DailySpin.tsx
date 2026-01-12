'use client';

import React, { useState, useEffect } from 'react';
import { X, Gift, Zap, Coffee, Trophy, Flame, Star } from 'lucide-react';

interface Reward {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
}

const REWARDS: Reward[] = [
    { id: 'xp_bonus', name: '+50 XP', icon: '⭐', color: 'from-yellow-400 to-amber-500', description: 'Bonus XP pour ta prochaine séance!' },
    { id: 'rest_day', name: 'Repos Mérité', icon: '😴', color: 'from-blue-400 to-indigo-500', description: 'Prends une journée off sans culpabilité!' },
    { id: 'challenge', name: 'Défi Express', icon: '⚡', color: 'from-purple-400 to-violet-500', description: '+10 reps sur ton premier exercice!' },
    { id: 'badge', name: 'Badge Rare', icon: '🏆', color: 'from-emerald-400 to-teal-500', description: 'Tu as débloqué un badge collector!' },
    { id: 'streak_shield', name: 'Bouclier Streak', icon: '🛡️', color: 'from-orange-400 to-red-500', description: 'Protège ton streak 1 jour!' },
    { id: 'mystery', name: 'Mystère', icon: '🎁', color: 'from-pink-400 to-rose-500', description: 'Une surprise t\'attend...' },
];

interface DailySpinProps {
    isOpen: boolean;
    onClose: () => void;
    onReward: (reward: Reward) => void;
}

export default function DailySpin({ isOpen, onClose, onReward }: DailySpinProps) {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [canSpin, setCanSpin] = useState(true);
    const [timeToNextSpin, setTimeToNextSpin] = useState('');

    useEffect(() => {
        checkSpinAvailability();
        const interval = setInterval(checkSpinAvailability, 1000);
        return () => clearInterval(interval);
    }, []);

    const checkSpinAvailability = () => {
        const lastSpin = localStorage.getItem('velox_last_spin');
        if (lastSpin) {
            const lastSpinDate = new Date(lastSpin);
            const now = new Date();
            const diff = now.getTime() - lastSpinDate.getTime();
            const hoursRemaining = 24 - (diff / (1000 * 60 * 60));

            if (hoursRemaining > 0) {
                setCanSpin(false);
                const hours = Math.floor(hoursRemaining);
                const minutes = Math.floor((hoursRemaining - hours) * 60);
                setTimeToNextSpin(`${hours}h ${minutes}m`);
            } else {
                setCanSpin(true);
                setTimeToNextSpin('');
            }
        }
    };

    const spin = () => {
        if (!canSpin || isSpinning) return;

        setIsSpinning(true);
        setSelectedReward(null);

        // Random reward
        const rewardIndex = Math.floor(Math.random() * REWARDS.length);
        const segmentAngle = 360 / REWARDS.length;
        const targetAngle = 360 * 5 + (360 - rewardIndex * segmentAngle - segmentAngle / 2);

        setRotation(prev => prev + targetAngle);

        setTimeout(() => {
            setIsSpinning(false);
            setSelectedReward(REWARDS[rewardIndex]);
            localStorage.setItem('velox_last_spin', new Date().toISOString());
            setCanSpin(false);
            onReward(REWARDS[rewardIndex]);
        }, 4000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-bounce-in">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Gift className="text-yellow-400" /> Daily Spin
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Wheel Container */}
                <div className="relative w-64 h-64 mx-auto mb-6">
                    {/* Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
                    </div>

                    {/* Wheel */}
                    <div
                        className="w-full h-full rounded-full overflow-hidden border-4 border-yellow-400 shadow-lg shadow-yellow-400/30"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
                        }}
                    >
                        {REWARDS.map((reward, index) => {
                            const angle = (360 / REWARDS.length) * index;
                            return (
                                <div
                                    key={reward.id}
                                    className={`absolute w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br ${reward.color}`}
                                    style={{
                                        transform: `rotate(${angle}deg) skewY(-30deg)`,
                                        transformOrigin: '0% 100%',
                                        left: '50%',
                                        top: '0%',
                                    }}
                                >
                                    <span
                                        className="absolute text-2xl"
                                        style={{
                                            transform: 'skewY(30deg) rotate(30deg)',
                                            top: '45%',
                                            left: '20%'
                                        }}
                                    >
                                        {reward.icon}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Center button */}
                    <button
                        onClick={spin}
                        disabled={!canSpin || isSpinning}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full font-black text-sm transition-all ${canSpin && !isSpinning
                                ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-900 hover:scale-110 cursor-pointer animate-pulse-glow'
                                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        {isSpinning ? '...' : 'SPIN'}
                    </button>
                </div>

                {/* Result or Timer */}
                {selectedReward ? (
                    <div className={`bg-gradient-to-r ${selectedReward.color} rounded-xl p-4 text-white animate-bounce-in`}>
                        <div className="text-4xl mb-2">{selectedReward.icon}</div>
                        <div className="font-black text-lg">{selectedReward.name}</div>
                        <div className="text-sm opacity-90">{selectedReward.description}</div>
                    </div>
                ) : !canSpin ? (
                    <div className="bg-slate-700/50 rounded-xl p-4 text-slate-300">
                        <div className="text-sm">Prochain spin dans</div>
                        <div className="text-2xl font-black text-yellow-400">{timeToNextSpin}</div>
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm">
                        Tourne la roue pour gagner une récompense !
                    </div>
                )}
            </div>
        </div>
    );
}
