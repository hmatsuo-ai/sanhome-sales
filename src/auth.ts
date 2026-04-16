import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

function roleFromUser(user: unknown): string | undefined {
    if (user && typeof user === "object" && "role" in user) {
        const r = (user as { role: unknown }).role;
        return typeof r === "string" ? r : undefined;
    }
    return undefined;
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    // next start（本番モード）では NODE_ENV=production のため trustHost が自動では true にならない。
    // LAN の IP や localhost 以外のホストでログインするには true が必要。
    trustHost: true,
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    let user: { id: string; name: string; email: string; role: string; password: string; isActive?: boolean } | null = null;
                    try {
                        user = await prisma.user.findUnique({
                            where: { email },
                            select: { id: true, name: true, email: true, role: true, password: true, isActive: true },
                        });
                    } catch {
                        // is_active カラムが未作成の場合は select から除外して再取得
                        user = await prisma.user.findUnique({
                            where: { email },
                            select: { id: true, name: true, email: true, role: true, password: true },
                        });
                    }
                    if (!user) return null;
                    if (user.isActive === false) return null; // 凍結アカウントはログイン不可

                    const passwordsMatch = await bcrypt.compare(password, user.password);
                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                const r = roleFromUser(user);
                if (r !== undefined) token.role = r;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                const u = session.user as { id?: string; role?: string };
                u.id = token.id as string;
                if (typeof token.role === "string") u.role = token.role;
            }
            return session;
        },
    },
});

