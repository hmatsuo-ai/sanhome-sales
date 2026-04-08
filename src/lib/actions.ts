"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn("credentials", formData);
    } catch (error) {
        // NextAuth v5 throws a redirect on successful sign-in.
        // We MUST re-throw it so Next.js can handle the redirect.
        if (isRedirectError(error)) {
            throw error;
        }
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "メールアドレスまたはパスワードが正しくありません。";
                default:
                    return "ログイン中にエラーが発生しました。";
            }
        }
        throw error;
    }
}

export async function logout() {
    await signOut({ redirectTo: "/login" });
}

