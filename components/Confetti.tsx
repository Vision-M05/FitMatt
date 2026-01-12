'use client';

import { useEffect, useState } from 'react';

export default function Confetti() {
    const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number; duration: number }[]>([]);

    useEffect(() => {
        const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];
        const newPieces = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 3
        }));
        setPieces(newPieces);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-2.5 h-2.5 top-[-10px] opacity-0 animate-confetti"
                    style={{
                        left: `${p.left}%`,
                        backgroundColor: p.color,
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`
                    }}
                />
            ))}
        </div>
    );
}
