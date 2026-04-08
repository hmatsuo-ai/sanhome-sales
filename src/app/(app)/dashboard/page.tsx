"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface User {
    id: string;
    name: string;
    role: string;
}

interface SummaryData {
    salesTotal: number;
    grossProfitTotal: number;
    expenseTotal: number;
    todaySchedules: { id: string; title: string; location: string; startTime: string; endTime: string }[];
}

function formatCurrency(n: number) {
    return "¥" + n.toLocaleString("ja-JP");
}

function StatCard({
    label,
    value,
    icon,
    color,
    sub,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    sub?: string;
}) {
    return (
        <div className="card flex items-start gap-4 animate-fadeIn">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<"month" | "year">("month");
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
    const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));

    // UI Label computing
    const displayLabel = viewMode === "month"
        ? format(new Date(selectedMonth + "-01"), "yyyy年M月", { locale: ja })
        : `${selectedYear}年`;

    useEffect(() => {
        fetch("/api/users?minimal=1")
            .then((r) => r.json())
            .then((data) => {
                setUsers(Array.isArray(data) ? data : []);
                if (currentUser) setSelectedUserId(currentUser.id);
            });
    }, [currentUser]);

    useEffect(() => {
        setLoading(true);

        const now = new Date();
        const todayStart = format(now, "yyyy-MM-dd") + "T00:00:00";
        const todayEnd = format(now, "yyyy-MM-dd") + "T23:59:59";

        let startRange: string;
        let endRange: string;

        if (viewMode === "month") {
            const [year, month] = selectedMonth.split("-").map(Number);
            startRange = `${format(new Date(year, month - 1, 1), "yyyy-MM-dd")}T00:00:00`;
            endRange = `${format(new Date(year, month, 0), "yyyy-MM-dd")}T23:59:59`;
        } else {
            startRange = `${selectedYear}-01-01T00:00:00`;
            endRange = `${selectedYear}-12-31T23:59:59`;
        }

        const params = new URLSearchParams({
            startDate: startRange,
            endDate: endRange,
            todayStart,
            todayEnd,
        });
        if (selectedUserId) params.set("userId", selectedUserId);

        fetch(`/api/dashboard/summary?${params}`)
            .then(async (r) => {
                if (!r.ok) throw new Error("summary failed");
                return r.json();
            })
            .then((data: SummaryData) => {
                setSummary({
                    salesTotal: data.salesTotal ?? 0,
                    grossProfitTotal: data.grossProfitTotal ?? 0,
                    expenseTotal: data.expenseTotal ?? 0,
                    todaySchedules: Array.isArray(data.todaySchedules) ? data.todaySchedules : [],
                });
            })
            .catch(() => {
                setSummary({
                    salesTotal: 0,
                    grossProfitTotal: 0,
                    expenseTotal: 0,
                    todaySchedules: [],
                });
            })
            .finally(() => setLoading(false));
    }, [selectedUserId, selectedMonth, selectedYear, viewMode]);

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
                    <p className="text-gray-400 text-sm mt-1">{displayLabel}の集計</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-500">表示:</label>
                        <select
                            className="form-input text-sm py-1.5"
                            style={{ width: "auto" }}
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as "month" | "year")}
                        >
                            <option value="month">月別</option>
                            <option value="year">年別</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-500">期間:</label>
                        {viewMode === "month" ? (
                            <input
                                type="month"
                                className="form-input text-sm py-1.5"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            />
                        ) : (
                            <select
                                className="form-input text-sm py-1.5"
                                style={{ width: "auto" }}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="2024">2024年</option>
                                <option value="2025">2025年</option>
                                <option value="2026">2026年</option>
                                <option value="2027">2027年</option>
                            </select>
                        )}
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-500">担当者:</label>
                        <select
                            className="form-input text-sm py-1.5"
                            style={{ width: "auto" }}
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            id="user-select"
                        >
                            <option value="">全員</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
                    読み込み中...
                </div>
            ) : summary ? (
                <div className="space-y-6">
                    {/* Stats grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            label="今月の売上合計"
                            value={formatCurrency(summary.salesTotal)}
                            color="bg-blue-50 text-blue-600"
                            sub={`粗利: ${formatCurrency(summary.grossProfitTotal)}`}
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="今月の粗利合計"
                            value={formatCurrency(summary.grossProfitTotal)}
                            color="bg-emerald-50 text-emerald-600"
                            sub={summary.salesTotal > 0 ? `粗利率: ${((summary.grossProfitTotal / summary.salesTotal) * 100).toFixed(1)}%` : undefined}
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            }
                        />
                        <StatCard
                            label="今月の経費合計"
                            value={formatCurrency(summary.expenseTotal)}
                            color="bg-red-50 text-red-500"
                            icon={
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Today's Schedule */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                本日のスケジュール
                            </h2>
                            <span className="text-sm text-gray-400">{format(new Date(), "M月d日(EEE)", { locale: ja })}</span>
                        </div>
                        {summary.todaySchedules.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">本日の予定はありません</p>
                        ) : (
                            <ul className="space-y-2">
                                {summary.todaySchedules.map((s) => (
                                    <li key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 dashboard-schedule-item">
                                        <div className="w-1.5 h-full min-h-6 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {format(new Date(s.startTime), "HH:mm")} ～ {format(new Date(s.endTime), "HH:mm")}
                                                {s.location && <span className="ml-2">📍 {s.location}</span>}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400">担当者を選択してください</div>
            )}
        </div>
    );
}
