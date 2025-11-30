// components/providers/user-provider.tsx
"use client";

import { useEffect } from "react";
import { useUserStore } from "../../lib/stores/user-store";
import type { UserData } from "../../lib/stores/user-store";

interface UserProviderProps {
    children: React.ReactNode;
    initialUser: UserData | null;
}

export function UserProvider({ children, initialUser }: UserProviderProps) {
    const setUser = useUserStore((state) => state.setUser);

    useEffect(() => {
        // Initialiser le store avec les données du serveur
        if (initialUser) {
            setUser(initialUser);
        }
    }, [initialUser, setUser]);

    return <>{children}</>;
}