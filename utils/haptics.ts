'use client';

/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 10],
    warning: [30, 20, 30],
    error: [50, 100, 50, 100, 50],
};

export const triggerHaptic = (type: HapticType = 'light') => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
            navigator.vibrate(hapticPatterns[type]);
        } catch (e) {
            // Silently fail if vibration not supported
        }
    }
};

/**
 * Play a sound effect
 */
const sounds = {
    tap: '/sounds/tap.mp3',
    success: '/sounds/success.mp3',
    complete: '/sounds/complete.mp3',
};

export const playSound = (sound: keyof typeof sounds) => {
    if (typeof window !== 'undefined') {
        try {
            const audio = new Audio(sounds[sound]);
            audio.volume = 0.3;
            audio.play().catch(() => { });
        } catch (e) {
            // Silently fail
        }
    }
};

/**
 * Combined feedback for premium feel
 */
export const feedback = {
    tap: () => {
        triggerHaptic('light');
    },
    check: () => {
        triggerHaptic('success');
    },
    complete: () => {
        triggerHaptic('heavy');
    },
    error: () => {
        triggerHaptic('error');
    },
};

export default feedback;
