"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    currentUser: AuthUser | null;
    setCurrentUser: (user: AuthUser | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    setCurrentUser: () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [meFromApi, setMeFromApi] = useState<AuthUser | null>(null);

    const sessionUid = (session?.user as { id?: string } | undefined)?.id;

    // JWT に id が無い・useSession が一時的に unauthenticated でも、Cookie が有効なら /api/me で復元する
    useEffect(() => {
        if (sessionUid) {
            setMeFromApi(null);
            return;
        }
        let cancelled = false;
        fetch("/api/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { id?: string; email?: string; name?: string; role?: string } | null) => {
                if (cancelled) return;
                if (data?.id) {
                    setMeFromApi({
                        id: data.id,
                        name: data.name ?? "",
                        email: data.email ?? "",
                        role: data.role ?? "sales",
                    });
                } else {
                    setMeFromApi(null);
                }
            })
            .catch(() => {
                if (!cancelled) setMeFromApi(null);
            });
        return () => {
            cancelled = true;
        };
    }, [sessionUid]);

    const currentUser: AuthUser | null =
        sessionUid && session?.user
            ? {
                  id: sessionUid,
                  name: session.user.name ?? "",
                  email: session.user.email ?? "",
                  role: (session.user as { role?: string }).role ?? "sales",
              }
            : meFromApi;

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser: () => { }, logout: () => { } }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

