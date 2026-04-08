"use client";

import React, { createContext, useContext } from "react";
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

    const uid = (session?.user as { id?: string } | undefined)?.id;
    const currentUser: AuthUser | null =
        session?.user && uid
            ? {
                  id: uid,
                  name: session.user.name ?? "",
                  email: session.user.email ?? "",
                  role: (session.user as { role?: string }).role ?? "sales",
              }
            : null;

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser: () => { }, logout: () => { } }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

