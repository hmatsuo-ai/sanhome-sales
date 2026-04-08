import type { NextAuthConfig } from "next-auth";

// Public paths that don't require authentication
const publicPaths = ["/login"];

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    session: { strategy: "jwt" },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isPublic = publicPaths.some((p) => nextUrl.pathname.startsWith(p));

            if (isPublic) {
                // If logged in and on the login page, redirect to dashboard
                if (isLoggedIn) {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
                return true;
            }

            // All other routes require login
            return isLoggedIn;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
