'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/app/utils/supabase/clients';

// Durée d'inactivité avant déconnexion : 30 minutes
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Avertissement 2 minutes avant la déconnexion
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'wheel',
] as const;

interface UseInactivityLogoutOptions {
    onWarning: () => void;
    onDismissWarning: () => void;
    timeoutMs?: number;
    warningBeforeMs?: number;
}

export function useInactivityLogout({
    onWarning,
    onDismissWarning,
    timeoutMs = INACTIVITY_TIMEOUT_MS,
    warningBeforeMs = WARNING_BEFORE_MS,
}: UseInactivityLogoutOptions) {
    const router = useRouter();
    const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isWarningActiveRef = useRef(false);

    const clearTimers = useCallback(() => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    }, []);

    const logout = useCallback(async () => {
        clearTimers();
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
        router.push('/login');
    }, [clearTimers, router]);

    const resetTimers = useCallback(() => {
        clearTimers();

        if (isWarningActiveRef.current) {
            isWarningActiveRef.current = false;
            onDismissWarning();
        }

        warningTimerRef.current = setTimeout(() => {
            isWarningActiveRef.current = true;
            onWarning();
        }, timeoutMs - warningBeforeMs);

        logoutTimerRef.current = setTimeout(() => {
            logout();
        }, timeoutMs);
    }, [clearTimers, logout, onWarning, onDismissWarning, timeoutMs, warningBeforeMs]);

    // Permet à la modale de déconnexion d'annuler et rester connecté
    const stayConnected = useCallback(() => {
        resetTimers();
    }, [resetTimers]);

    useEffect(() => {
        resetTimers();

        const handleActivity = () => resetTimers();

        ACTIVITY_EVENTS.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            clearTimers();
            ACTIVITY_EVENTS.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimers, clearTimers]);

    return { stayConnected, logout };
}
