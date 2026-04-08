"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, addDays, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive?: boolean;
    group?: { name: string } | null;
}

interface Expense {
    id: string;
    date: string;
    category: string;
    amount: number;
    memo: string | null;
}

interface Sale {
    id: string;
    date: string;
    projectName: string;
    grossProfit: number;
    profitRatios?: string;
    assignees: { id: string }[];
}

interface Schedule {
    id: string;
    startTime: string;
    endTime: string;
    title: string;
    location: string;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { currentUser } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    // アカウント設定
    const [editEmail, setEditEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountSaving, setAccountSaving] = useState(false);
    const [accountMessage, setAccountMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const isSelf = currentUser?.id === id;
    const isAdmin = currentUser?.role === "admin";

    const fetchData = async () => {
        setLoading(true);
        try {
            const uRes = await fetch(`/api/users/${id}`);
            const uData = await uRes.json();
            setUser(uData);
            setEditEmail(uData.email ?? "");
            const [eRes, sRes, schRes] = await Promise.all([
                fetch(`/api/expenses?userId=${id}&month=${month}`),
                fetch(`/api/sales?userId=${id}`),
                fetch(`/api/schedules?userId=${id}`)
            ]);
            const [eData, sData, schData] = await Promise.all([eRes.json(), sRes.json(), schRes.json()]);
            setExpenses(Array.isArray(eData) ? eData : []);
            setSales(Array.isArray(sData) ? sData : []);
            setSchedules(Array.isArray(schData) ? schData : []);
        } catch (error) {
            console.error("Fetch detail error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, month]);

    // Filter sales by selected date range
    const filteredSales = useMemo(() => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        return sales.filter(s => {
            const time = new Date(s.date).getTime();
            return time >= start && time <= end;
        });
    }, [sales, startDate, endDate]);

    // Calculate split profit for this user
    const totalProfit = useMemo(() => {
        return filteredSales.reduce((acc, s) => {
            const ratios: Record<string, number> = s.profitRatios ? JSON.parse(s.profitRatios) : {};
            const numAssignees = s.assignees.length || 1;
            const ratio = ratios[id] !== undefined ? ratios[id] : (1 / numAssignees);
            return acc + (s.grossProfit * ratio);
        }, 0);
    }, [filteredSales, id]);

    const totalExpense = useMemo(() => {
        return expenses.reduce((acc, e) => acc + e.amount, 0);
    }, [expenses]);

    const clearAccountMessage = () => setAccountMessage(null);

    const handleSaveEmail = async () => {
        if (!user || editEmail.trim() === user.email) return;
        setAccountSaving(true);
        setAccountMessage(null);
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: editEmail.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "更新に失敗しました");
            setUser((u) => (u ? { ...u, email: editEmail.trim() } : null));
            setAccountMessage({ type: "success", text: "メールアドレスを更新しました" });
        } catch (e) {
            setAccountMessage({ type: "error", text: e instanceof Error ? e.message : "更新に失敗しました" });
        } finally {
            setAccountSaving(false);
        }
    };

    const handleSavePassword = async () => {
        if (newPassword.length < 6) {
            setAccountMessage({ type: "error", text: "新しいパスワードは6文字以上で入力してください" });
            return;
        }
        if (newPassword !== confirmPassword) {
            setAccountMessage({ type: "error", text: "新しいパスワードが一致しません" });
            return;
        }
        setAccountSaving(true);
        setAccountMessage(null);
        try {
            const body: { password: string; currentPassword?: string } = { password: newPassword };
            if (isSelf) body.currentPassword = currentPassword;
            const res = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "パスワードの更新に失敗しました");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setAccountMessage({ type: "success", text: "パスワードを更新しました" });
        } catch (e) {
            setAccountMessage({ type: "error", text: e instanceof Error ? e.message : "パスワードの更新に失敗しました" });
        } finally {
            setAccountSaving(false);
        }
    };

    const handleFreezeToggle = async () => {
        if (!user || !isAdmin || isSelf) return;
        setAccountSaving(true);
        setAccountMessage(null);
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !user.isActive }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "更新に失敗しました");
            setUser((u) => (u ? { ...u, isActive: !u.isActive } : null));
            setAccountMessage({ type: "success", text: user.isActive ? "アカウントを凍結しました" : "凍結を解除しました" });
        } catch (e) {
            setAccountMessage({ type: "error", text: e instanceof Error ? e.message : "更新に失敗しました" });
        } finally {
            setAccountSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        setAccountMessage(null);
        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "削除に失敗しました");
            if (isSelf) {
                window.location.href = "/api/auth/signout?callbackUrl=/login";
            } else {
                window.location.href = "/settings";
            }
        } catch (e) {
            setAccountMessage({ type: "error", text: e instanceof Error ? e.message : "削除に失敗しました" });
            setDeleting(false);
        }
    };

    // Schedule for current week
    const weekDays = useMemo(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>;
    if (!user) return <div className="p-8 text-center text-red-500">ユーザーが見つかりません</div>;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/settings" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{user.name} さんの詳細</h1>
                    <p className="text-sm text-gray-500">{user.group?.name || "グループ未所属"} • {user.role === "admin" ? "管理者" : "営業"}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Statistics Cards */}
                <div className="card border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30">
                    <div className="flex flex-col mb-2">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">期間粗利（配分後）</p>
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                className="text-[9px] border border-gray-100 rounded bg-white/50 px-1 py-0.5 focus:ring-1 focus:ring-blue-200 outline-none w-24"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span className="text-[9px] text-gray-400">〜</span>
                            <input
                                type="date"
                                className="text-[9px] border border-gray-100 rounded bg-white/50 px-1 py-0.5 focus:ring-1 focus:ring-blue-200 outline-none w-24"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="text-3xl font-black text-gray-900">¥{totalProfit.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-2">※選択期間内の集計</p>
                </div>

                <div className="card border-l-4 border-l-red-500 bg-gradient-to-br from-white to-red-50/30">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">月間経費合計</p>
                        <input
                            type="month"
                            className="text-[10px] border-none bg-transparent p-0 focus:ring-0 cursor-pointer text-gray-400"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                        />
                    </div>
                    <p className="text-3xl font-black text-gray-900">¥{totalExpense.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-2">対象月: {format(new Date(month), "yyyy年MM月")}</p>
                </div>

                <div className="card border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">今週の予定数</p>
                    <p className="text-3xl font-black text-gray-900">{schedules.length} 件</p>
                    <p className="text-[10px] text-gray-400 mt-2">直近のスケジュール</p>
                </div>

                {/* Main Content Areas */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Expense List */}
                    <div className="card p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-gray-800 text-sm">経費詳細 ({format(new Date(month), "MM月")})</h2>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">日付</th>
                                        <th className="px-4 py-2 font-medium">カテゴリ</th>
                                        <th className="px-4 py-2 font-medium text-right">金額</th>
                                        <th className="px-4 py-2 font-medium">メモ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {expenses.length === 0 ? (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">データなし</td></tr>
                                    ) : (
                                        expenses.map(e => (
                                            <tr key={e.id} className="hover:bg-gray-50/50">
                                                <td className="px-4 py-3 whitespace-nowrap">{format(new Date(e.date), "MM/dd")}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100/80 text-slate-600 rounded-full text-[10px] dark:bg-[var(--color-surface-elevated)] dark:text-[var(--color-text-muted)]">{e.category}</span></td>
                                                <td className="px-4 py-3 font-bold text-right">¥{e.amount.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]">{e.memo}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sales List */}
                    <div className="card p-0 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="font-bold text-gray-800 text-sm">売上実績 (案件別配分)</h2>
                            <p className="text-[10px] text-gray-400">期間: {startDate.replace(/-/g, "/")} 〜 {endDate.replace(/-/g, "/")}</p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">契約日</th>
                                        <th className="px-4 py-2 font-medium">案件名</th>
                                        <th className="px-4 py-2 font-medium text-right">自分の粗利</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSales.length === 0 ? (
                                        <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">指定期間のデータなし</td></tr>
                                    ) : (
                                        filteredSales.map(s => {
                                            const ratios: Record<string, number> = s.profitRatios ? JSON.parse(s.profitRatios) : {};
                                            const ratio = ratios[id] !== undefined ? ratios[id] : (1 / s.assignees.length);
                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 whitespace-nowrap">{format(new Date(s.date), "yyyy/MM/dd")}</td>
                                                    <td className="px-4 py-3 font-medium">{s.projectName}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-slate-700 font-bold dark:text-[var(--color-text)]">¥{(s.grossProfit * ratio).toLocaleString()}</span>
                                                        <span className="text-[10px] text-gray-400 ml-1">({(ratio * 100).toFixed(0)}%)</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Account settings + Weekly Schedule */}
                <div className="space-y-6">
                    {/* アカウント設定（本人または管理者が編集可能な場合のみ表示） */}
                    {(isSelf || isAdmin) && (
                        <div className="card">
                            <h2 className="font-bold text-gray-800 text-sm mb-4">アカウント設定</h2>
                            {user.isActive === false && (
                                <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">このアカウントは凍結されています</div>
                            )}
                            {accountMessage && (
                                <div
                                    className={`mb-4 px-3 py-2 rounded-lg text-sm ${accountMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                                    role="alert"
                                >
                                    {accountMessage.text}
                                    <button type="button" onClick={clearAccountMessage} className="ml-2 underline">閉じる</button>
                                </div>
                            )}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">メールアドレス</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                        placeholder="example@sunhome.co.jp"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSaveEmail}
                                        disabled={accountSaving || editEmail.trim() === user.email}
                                        className="mt-1 text-sm text-blue-600 hover:underline disabled:opacity-50"
                                    >
                                        保存
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">パスワード変更</label>
                                    {isSelf && (
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2"
                                            placeholder="現在のパスワード"
                                        />
                                    )}
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2"
                                        placeholder="新しいパスワード（6文字以上）"
                                    />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-1"
                                        placeholder="新しいパスワード（再入力）"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSavePassword}
                                        disabled={accountSaving || !newPassword || newPassword !== confirmPassword}
                                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                                    >
                                        パスワードを変更
                                    </button>
                                </div>
                                {isAdmin && !isSelf && (
                                    <div>
                                        <button
                                            type="button"
                                            onClick={handleFreezeToggle}
                                            disabled={accountSaving}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${user.isActive ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-green-100 text-green-800 hover:bg-green-200"}`}
                                        >
                                            {user.isActive ? "アカウントを凍結" : "凍結を解除"}
                                        </button>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirm(true)}
                                        disabled={accountSaving || deleting}
                                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                                    >
                                        アカウントを削除
                                    </button>
                                </div>
                            </div>
                            {deleteConfirm && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-800 mb-2">
                                        {isSelf ? "自分のアカウントを削除します。ログアウトされます。よろしいですか？" : "このユーザーを削除します。よろしいですか？"}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {deleting ? "削除中..." : "削除する"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setDeleteConfirm(false); setAccountMessage(null); }}
                                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                                        >
                                            キャンセル
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="card">
                        <h2 className="font-bold text-gray-800 text-sm mb-4">週間スケジュール</h2>
                        <div className="space-y-3">
                            {weekDays.map(day => {
                                const daySchedules = schedules.filter(s => {
                                    const d = new Date(s.startTime);
                                    return d.getFullYear() === day.getFullYear() &&
                                        d.getMonth() === day.getMonth() &&
                                        d.getDate() === day.getDate();
                                });

                                return (
                                    <div key={day.toISOString()} className={`p-2 rounded-lg border ${daySchedules.length > 0 ? "border-emerald-100 bg-emerald-50/30" : "border-gray-50 bg-gray-50/10"}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-gray-500">{format(day, "M/d (E)", { locale: ja })}</span>
                                            {daySchedules.length > 0 && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full">{daySchedules.length}</span>}
                                        </div>
                                        {daySchedules.length === 0 ? (
                                            <p className="text-[10px] text-gray-300">予定なし</p>
                                        ) : (
                                            <div className="space-y-1">
                                                {daySchedules.map(s => (
                                                    <div key={s.id} className="text-[11px] leading-tight">
                                                        <span className="font-bold text-gray-700">{format(new Date(s.startTime), "HH:mm")}</span> {s.title}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
