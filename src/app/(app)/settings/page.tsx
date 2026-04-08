"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface Group {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    groupId: string | null;
}

interface DatabaseModulesPayload {
    allUseSingleDatabase: boolean;
    modules: {
        id: string;
        label: string;
        envKey: string;
        description: string;
        usesDedicatedEnv: boolean;
        healthy: boolean;
        error?: string;
    }[];
}

function DatabaseModulesCard() {
    const [payload, setPayload] = useState<DatabaseModulesPayload | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/system/database-modules")
            .then(async (r) => {
                const data = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(typeof data.error === "string" ? data.error : "取得に失敗しました");
                return data as DatabaseModulesPayload;
            })
            .then((data) => {
                if (!cancelled) setPayload(data);
            })
            .catch((e) => {
                if (!cancelled) setLoadError(e instanceof Error ? e.message : "取得に失敗しました");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4-8-4s-8 1.79-8 4" />
                </svg>
                データベース接続（機能別）
            </h2>
            <p className="text-sm text-gray-600 mb-4">
                既定では <code className="text-xs bg-gray-100 px-1 rounded">DATABASE_URL</code> 1本で全機能を利用します。
                Neon などで機能ごとに別データベースを作成した場合は、Vercel や .env に下記の環境変数を設定し、各 DB に同じマイグレーションを適用してください（
                <code className="text-xs bg-gray-100 px-1 rounded">npm run db:migrate:all</code>
                ）。
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
                スキーマ上、ユーザーと売上・経費などは外部キーで結ばれています。別 DB に分ける場合は各 DB に同一スキーマを入れ、データの整合に注意してください。シンプルな運用では接続先は1本を推奨します。
            </p>
            {loading && <p className="text-sm text-gray-500">確認中...</p>}
            {loadError && <p className="text-sm text-red-600">{loadError}</p>}
            {!loading && payload && (
                <>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                        {payload.allUseSingleDatabase
                            ? "現在: すべて DATABASE_URL（または未設定のフォールバック）で統一中です。"
                            : "現在: 機能別の環境変数が一部設定されています。"}
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                                    <th className="px-3 py-2">機能</th>
                                    <th className="px-3 py-2">環境変数</th>
                                    <th className="px-3 py-2">専用URL</th>
                                    <th className="px-3 py-2">接続</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payload.modules.map((m) => (
                                    <tr key={m.id} className="border-t border-gray-100">
                                        <td className="px-3 py-2 font-medium text-gray-800">{m.label}</td>
                                        <td className="px-3 py-2">
                                            <code className="text-xs bg-gray-100 px-1 rounded break-all">{m.envKey}</code>
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{m.usesDedicatedEnv ? "あり" : "いいえ（既定）"}</td>
                                        <td className="px-3 py-2">
                                            {m.healthy ? (
                                                <span className="text-green-600 font-medium">OK</span>
                                            ) : (
                                                <span className="text-red-600" title={m.error}>
                                                    失敗
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

function ThemeToggleCard() {
    const { theme, setTheme } = useTheme();
    return (
        <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                表示
            </h2>
            <p className="text-sm text-gray-600 mb-4">ダークモードとライトモードを切り替えます。設定はログアウト後も保持されます。</p>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${theme === "light" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                    ライト
                </button>
                <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${theme === "dark" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                    ダーク
                </button>
            </div>
        </div>
    );
}

function AccountSection({ currentUserId, initialEmail }: { currentUserId: string; initialEmail: string }) {
    const [email, setEmail] = useState(initialEmail);
    const [emailSaving, setEmailSaving] = useState(false);
    const [emailMessage, setEmailMessage] = useState<"success" | "error" | null>(null);

    useEffect(() => {
        setEmail(initialEmail);
    }, [initialEmail]);

    const handleSaveEmail = async () => {
        const trimmed = email.trim();
        if (!trimmed || trimmed === initialEmail) return;
        setEmailSaving(true);
        setEmailMessage(null);
        try {
            const res = await fetch(`/api/users/${currentUserId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmed }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setEmailMessage("success");
            } else {
                setEmailMessage("error");
                alert(data.error || "メールアドレスの更新に失敗しました");
            }
        } catch {
            setEmailMessage("error");
            alert("メールアドレスの更新に失敗しました");
        } finally {
            setEmailSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                    type="email"
                    placeholder="example@sunhome.co.jp"
                    className="form-input max-w-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailSaving}
                    autoComplete="email"
                />
                <button
                    type="button"
                    className="ml-2 mt-1 btn btn-primary"
                    onClick={handleSaveEmail}
                    disabled={emailSaving || email.trim() === initialEmail || !email.trim()}
                >
                    {emailSaving ? "保存中..." : "メールアドレスを更新"}
                </button>
                {emailMessage === "success" && (
                    <p className="mt-2 text-sm text-green-600">メールアドレスを更新しました。</p>
                )}
            </div>
            <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">パスワードの変更が行えます。現在のパスワードの照合と、新しいパスワードの2重入力が必要です。</p>
                <SalesPasswordForm currentUserId={currentUserId} />
            </div>
        </div>
    );
}

function SalesPasswordForm({ currentUserId }: { currentUserId: string }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        const cur = currentPassword.trim();
        const newPwd = newPassword.trim();
        const pwdConfirm = newPasswordConfirm.trim();
        if (!cur) {
            alert("現在のパスワードを入力してください");
            return;
        }
        if (!newPwd) {
            alert("新しいパスワードを入力してください");
            return;
        }
        if (newPwd.length < 6) {
            alert("新しいパスワードは6文字以上で入力してください");
            return;
        }
        if (newPwd !== pwdConfirm) {
            alert("新しいパスワードと確認用が一致しません");
            return;
        }
        if (!window.confirm("パスワードを変更しますか？")) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/users/${currentUserId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: cur, password: newPwd }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                alert("パスワードを更新しました");
                setCurrentPassword("");
                setNewPassword("");
                setNewPasswordConfirm("");
            } else {
                alert(data.error || "更新に失敗しました");
            }
        } catch {
            alert("更新に失敗しました");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
                <input
                    type="password"
                    placeholder="現在のパスワードを入力"
                    className="form-input max-w-xs"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="current-password"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
                <input
                    type="password"
                    placeholder="6文字以上"
                    className="form-input max-w-xs"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={submitting}
                    minLength={6}
                    autoComplete="new-password"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
                <input
                    type="password"
                    placeholder="もう一度入力"
                    className="form-input max-w-xs"
                    value={newPasswordConfirm}
                    onChange={e => setNewPasswordConfirm(e.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                />
            </div>
            <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !currentPassword || !newPassword || !newPasswordConfirm}
            >
                {submitting ? "更新中..." : "パスワードを更新"}
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === "admin";
    const currentUserId = currentUser?.id;

    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [newGroupName, setNewGroupName] = useState("");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // New User State
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("password123");
    const [newUserRole, setNewUserRole] = useState("sales");
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const [gRes, uRes] = await Promise.all([
                    fetch("/api/groups"),
                    fetch("/api/users")
                ]);
                const gData = await gRes.json();
                const uData = await uRes.json();
                setGroups(Array.isArray(gData) ? gData : []);
                setUsers(Array.isArray(uData) ? uData : []);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (session === undefined) return;
        void fetchData();
    }, [session, isAdmin]);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setIsCreatingGroup(true);
        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGroupName }),
            });
            if (res.ok) {
                setNewGroupName("");
                fetchData();
            }
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("このグループを削除しますか？（所属ユーザーは未設定になります）")) return;
        const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
        setIsCreatingUser(true);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole
                }),
            });
            if (res.ok) {
                setNewUserName("");
                setNewUserEmail("");
                setNewUserPassword("password123");
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || "ユーザーの作成に失敗しました");
            }
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error("Update user error:", error);
        }
    };

    if (loading || session === undefined) {
        return (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
        );
    }

    // 営業はパスワード変更のみ可能（その他の情報は表示しない）
    // (app) レイアウトで未ログインは除外済み。currentUser は AuthContext の /api/me で復元するまで待つ
    if (!isAdmin) {
        if (!currentUserId) {
            return (
                <div className="p-8 text-center text-gray-400">アカウント情報を読み込み中です。</div>
            );
        }
        return (
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 font-noto">設定</h1>
                <ThemeToggleCard />
                <div className="card">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        アカウント
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">メールアドレスとパスワードの変更が行えます。</p>
                    <AccountSection
                        currentUserId={currentUserId}
                        initialEmail={(session?.user as { email?: string } | undefined)?.email ?? ""}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-noto">システム設定</h1>
            <ThemeToggleCard />
            <DatabaseModulesCard />
            <div className="grid grid-cols-1 gap-8">
                {/* 1. User Registration */}
                <div>
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">新規ユーザー登録</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">名前</label>
                                <input
                                    type="text"
                                    className="form-input text-sm"
                                    placeholder="山田 太郎"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">メールアドレス</label>
                                <input
                                    type="email"
                                    className="form-input text-sm"
                                    placeholder="example@sunhome.co.jp"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">初期パスワード</label>
                                <input
                                    type="text"
                                    className="form-input text-sm"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">権限</label>
                                <select
                                    className="form-input text-sm"
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                >
                                    <option value="sales">営業担当</option>
                                    <option value="admin">管理者</option>
                                </select>
                            </div>
                            <button
                                className="btn btn-primary w-full mt-2"
                                onClick={handleCreateUser}
                                disabled={isCreatingUser || !newUserName.trim() || !newUserEmail.trim()}
                            >
                                {isCreatingUser ? "登録中..." : "ユーザーを登録"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Group Management */}
                <div>
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">グループ管理</h2>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="form-input text-sm"
                                placeholder="新グループ名"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <button
                                className="btn btn-primary whitespace-nowrap"
                                onClick={handleCreateGroup}
                                disabled={isCreatingGroup || !newGroupName.trim()}
                            >
                                追加
                            </button>
                        </div>

                        <div className="space-y-2">
                            {groups.map((g) => (
                                <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteGroup(g.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        title="削除"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. User List & Assignment */}
                <div>
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">ユーザー一覧・所属設定</h2>
                        <div className="space-y-4">
                            {users.map((u) => (
                                <div key={u.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                                            {u.role === "admin" ? "管理者" : "営業"}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">所属グループ</label>
                                        <select
                                            className="form-input text-xs py-1.5"
                                            value={u.groupId || ""}
                                            onChange={(e) => handleUpdateUser(u.id, { groupId: e.target.value || null })}
                                        >
                                            <option value="">（未設定）</option>
                                            {groups.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <Link
                                            href={`/users/${u.id}`}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            個人詳細・パスワード変更
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

