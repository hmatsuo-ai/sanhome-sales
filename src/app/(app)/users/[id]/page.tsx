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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [uRes, eRes, sRes, schRes] = await Promise.all([
                fetch(`/api/users/${id}`),
                fetch(`/api/expenses?userId=${id}&month=${month}`),
                fetch(`/api/sales?userId=${id}`), // Fetches sales where user is creator or assignee
                fetch(`/api/schedules?userId=${id}`)
            ]);

            const [uData, eData, sData, schData] = await Promise.all([
                uRes.json(), eRes.json(), sRes.json(), schRes.json()
            ]);

            setUser(uData);
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

                {/* Account Actions (Admin or Owner) */}
                <div className="lg:col-span-3">
                    <div className="card bg-gray-900 text-white">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-sm font-bold flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    アカウント設定
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-1">メールアドレスやパスワードの変更が行えます。</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="space-y-1">
                                    <label className="block text-[10px] text-gray-500 font-bold uppercase">新しいパスワード</label>
                                    <div className="flex gap-2">
                                        <input
                                            id="new-password"
                                            type="text"
                                            placeholder="8文字以上推奨"
                                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 transition-colors w-40"
                                        />
                                        <button
                                            onClick={async () => {
                                                const pwd = (document.getElementById("new-password") as HTMLInputElement).value;
                                                if (!pwd) return alert("パスワードを入力してください");
                                                if (!confirm("パスワードを変更しますか？")) return;
                                                const res = await fetch(`/api/users/${id}`, {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ password: pwd }),
                                                });
                                                if (res.ok) {
                                                    alert("パスワードを更新しました");
                                                    (document.getElementById("new-password") as HTMLInputElement).value = "";
                                                } else {
                                                    alert("更新に失敗しました");
                                                }
                                            }}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors"
                                        >
                                            更新
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-gray-100 rounded-full text-[10px]">{e.category}</span></td>
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
                                                        <span className="text-blue-700 font-bold">¥{(s.grossProfit * ratio).toLocaleString()}</span>
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

                {/* Sidebar: Weekly Schedule */}
                <div className="space-y-6">
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
