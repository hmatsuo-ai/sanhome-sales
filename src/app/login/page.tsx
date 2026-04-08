"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { authenticate } from "@/lib/actions";

type Tab = "login" | "register";

export default function LoginPage() {
    const [tab, setTab] = useState<Tab>("login");
    const [errorMessage, dispatch] = useActionState(authenticate, undefined);
    const [regError, setRegError] = useState<string | null>(null);
    const [regPending, setRegPending] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setRegError(null);
        const form = e.currentTarget;
        const name = (form.elements.namedItem("regName") as HTMLInputElement).value.trim();
        const email = (form.elements.namedItem("regEmail") as HTMLInputElement).value.trim();
        const password = (form.elements.namedItem("regPassword") as HTMLInputElement).value;
        const confirm = (form.elements.namedItem("regPasswordConfirm") as HTMLInputElement).value;
        if (password !== confirm) {
            setRegError("パスワードと確認用が一致しません。");
            return;
        }
        setRegPending(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setRegError(typeof data.error === "string" ? data.error : "登録に失敗しました。");
                return;
            }
            const signResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });
            if (signResult?.error) {
                setRegError("登録は完了しました。「ログイン」タブから同じメールとパスワードでログインしてください。");
                setTab("login");
                return;
            }
            router.push("/dashboard");
            router.refresh();
        } catch {
            setRegError("通信エラーが発生しました。");
        } finally {
            setRegPending(false);
        }
    };

    return (
        <div className="login-page-bg min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 shadow-xl shadow-blue-100 mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">サンホーム</h1>
                    <p className="text-gray-500 mt-2 font-medium">営業統合管理システム</p>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex rounded-xl bg-gray-100/80 p-1 mb-6">
                        <button
                            type="button"
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "login" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            onClick={() => { setTab("login"); setRegError(null); }}
                        >
                            ログイン
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${tab === "register" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            onClick={() => { setTab("register"); setRegError(null); }}
                        >
                            アカウント作成
                        </button>
                    </div>

                    {tab === "login" ? (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">ログイン</h2>
                            <form action={dispatch} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">メールアドレス</label>
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="example@sunhome.co.jp"
                                        required
                                        autoComplete="email"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">パスワード</label>
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        autoComplete="current-password"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                {errorMessage && (
                                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-shake">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {errorMessage}
                                    </div>
                                )}
                                <LoginButton />
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">アカウント作成</h2>
                            <p className="text-xs text-gray-500 text-center mb-6">営業担当として登録されます。管理者権限が必要な場合は管理者に依頼してください。</p>
                            <form onSubmit={handleRegister} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">お名前</label>
                                    <input
                                        name="regName"
                                        type="text"
                                        placeholder="山田 太郎"
                                        required
                                        autoComplete="name"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">メールアドレス</label>
                                    <input
                                        name="regEmail"
                                        type="email"
                                        placeholder="example@sunhome.co.jp"
                                        required
                                        autoComplete="email"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">パスワード（6文字以上）</label>
                                    <input
                                        name="regPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">パスワード（確認）</label>
                                    <input
                                        name="regPasswordConfirm"
                                        type="password"
                                        placeholder="もう一度入力"
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                        className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
                                    />
                                </div>
                                {regError && (
                                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {regError}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={regPending}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {regPending ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            アカウントを作成してログイン
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center mt-8 text-gray-400 text-sm">
                    © 2025 VEXUM. 営業統合管理システム
                </p>
            </div>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
        >
            {pending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    ログインする
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </>
            )}
        </button>
    );
}
