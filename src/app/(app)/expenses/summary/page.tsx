"use client";

import { format, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface Expense {
    id: string;
    userId: string;
    amount: number;
    user: { id: string; name: string };
}

type SummarySortKey = "name" | "total";

const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

export default function ExpensesSummaryPage() {
    const today = new Date();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => toYmd(startOfMonth(today)));
    const [endDate, setEndDate] = useState(() => toYmd(endOfMonth(today)));
    const [sortKey, setSortKey] = useState<SummarySortKey>("total");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`)
            .then((r) => r.json())
            .then((data) => setExpenses(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    const byUser = expenses.reduce((acc, e) => {
        const id = e.userId;
        const name = e.user?.name ?? "不明";
        if (!acc[id]) acc[id] = { id, name, total: 0, count: 0 };
        acc[id].total += e.amount;
        acc[id].count += 1;
        return acc;
    }, {} as Record<string, { id: string; name: string; total: number; count: number }>);

    const rows = useMemo(() => {
        const list = Object.values(byUser);
        const dir = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            if (sortKey === "name") return (a.name || "").localeCompare(b.name || "") * dir;
            return (a.total - b.total) * dir;
        });
        return list;
    }, [expenses, sortKey, sortDir]); // byUser derived from expenses

    const handleSort = (key: SummarySortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir(key === "total" ? "desc" : "asc");
        }
    };
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/expenses" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">経費 個人別合計</h1>
                    </div>
                    <p className="text-gray-400 text-sm">担当者ごとの経費合計を表示期間で一覧確認できます</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        className="form-input text-sm"
                        style={{ width: "auto" }}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-gray-400">〜</span>
                    <input
                        type="date"
                        className="form-input text-sm"
                        style={{ width: "auto" }}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
                        読み込み中...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>この期間の経費データがありません</p>
                        <Link href="/expenses" className="text-blue-600 hover:underline text-sm mt-2 inline-block">経費精算に戻る</Link>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <p className="text-sm font-bold text-gray-700">
                                {format(new Date(startDate), "yyyy/M/d", { locale: ja })}〜{format(new Date(endDate), "yyyy/M/d", { locale: ja })} 合計: ¥{grandTotal.toLocaleString("ja-JP")}（{expenses.length}件）
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-12 text-center">#</th>
                                        <th
                                            role="columnheader"
                                            aria-sort={sortKey === "name" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                                            className="cursor-pointer select-none hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap touch-manipulation"
                                            onClick={() => handleSort("name")}
                                        >
                                            <span className="inline-flex items-center gap-1">
                                                担当者
                                                <span className="text-gray-400" aria-hidden>
                                                    {sortKey === "name" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                                                </span>
                                            </span>
                                        </th>
                                        <th className="text-right">件数</th>
                                        <th
                                            role="columnheader"
                                            aria-sort={sortKey === "total" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                                            className="cursor-pointer select-none hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap touch-manipulation text-right"
                                            onClick={() => handleSort("total")}
                                        >
                                            <span className="inline-flex items-center gap-1 justify-end">
                                                合計金額
                                                <span className="text-gray-400" aria-hidden>
                                                    {sortKey === "total" ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                                                </span>
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={r.id}>
                                            <td className="text-center text-gray-500 text-sm">{i + 1}</td>
                                            <td className="font-medium">{r.name}</td>
                                            <td className="text-right">{r.count}件</td>
                                            <td className="text-right font-bold">¥{r.total.toLocaleString("ja-JP")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
