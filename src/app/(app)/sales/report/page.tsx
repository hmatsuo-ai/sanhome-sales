"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

interface UserRow {
    id: string;
    name: string;
    groupId?: string | null;
    role?: string;
    isActive?: boolean;
}

interface GroupRow {
    id: string;
    name: string;
}

interface SaleRow {
    id: string;
    userId: string;
    date: string;
    salesAmount: number;
    grossProfit: number;
    profitRatios?: string | null;
    assignees: { id: string; name: string }[];
    user: { id: string; name: string };
}

type Scope = "individual" | "group";
type SortKey = "name" | "sales" | "gross" | "count";

function ReportSortTh({
    column,
    sortKey,
    sortDir,
    onSort,
    className,
    alignEnd,
    children,
}: {
    column: SortKey;
    sortKey: SortKey;
    sortDir: "asc" | "desc";
    onSort: (k: SortKey) => void;
    className?: string;
    alignEnd?: boolean;
    children: React.ReactNode;
}) {
    const active = sortKey === column;
    const desc = sortDir === "desc";
    return (
        <th className={`whitespace-nowrap ${className || ""}`}>
            <button
                type="button"
                className={`inline-flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 font-semibold text-gray-600 w-full min-h-[44px] sm:min-h-0 ${alignEnd ? "justify-end text-right" : "text-left"}`}
                onClick={() => onSort(column)}
            >
                {children}
                <span className="text-gray-400 text-xs shrink-0" aria-hidden>
                    {active ? (desc ? "▼" : "▲") : "⇅"}
                </span>
            </button>
        </th>
    );
}

function parseRatios(json: string | null | undefined): Record<string, number> {
    if (!json) return {};
    try {
        return JSON.parse(json) as Record<string, number>;
    } catch {
        return {};
    }
}

export default function SalesReportPage() {
    const [sales, setSales] = useState<SaleRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [groups, setGroups] = useState<GroupRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [scope, setScope] = useState<Scope>("individual");
    const [sortKey, setSortKey] = useState<SortKey>("gross");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        fetch("/api/users")
            .then((r) => r.json())
            .then((d) => setUsers(Array.isArray(d) ? d : []));
        fetch("/api/groups")
            .then((r) => r.json())
            .then((d) => setGroups(Array.isArray(d) ? d : []));
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => setLoading(true), 0);
        fetch(`/api/sales?startDate=${startDate}&endDate=${endDate}`)
            .then((r) => r.json())
            .then((d) => setSales(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
        return () => window.clearTimeout(t);
    }, [startDate, endDate]);

    const rows = useMemo(() => {
        const salesUsers = users.filter((u) => (u.role ?? "sales") === "sales" && u.isActive !== false);
        const baseIds =
            salesUsers.length > 0
                ? salesUsers.map((u) => u.id)
                : users.filter((u) => u.isActive !== false).map((u) => u.id);

        const byUser: Record<string, { name: string; sales: number; gross: number; count: number }> = {};
        for (const id of baseIds) {
            const u = users.find((x) => x.id === id);
            byUser[id] = { name: u?.name ?? "不明", sales: 0, gross: 0, count: 0 };
        }

        for (const s of sales) {
            const ratios = parseRatios(s.profitRatios);
            const assigneeList = s.assignees.length > 0 ? s.assignees : [{ id: s.user.id, name: s.user.name }];
            const n = assigneeList.length;
            for (const a of assigneeList) {
                if (!byUser[a.id]) byUser[a.id] = { name: a.name, sales: 0, gross: 0, count: 0 };
                const ratio = ratios[a.id] !== undefined ? ratios[a.id] : 1 / n;
                byUser[a.id].sales += s.salesAmount * ratio;
                byUser[a.id].gross += s.grossProfit * ratio;
                byUser[a.id].count += 1;
            }
        }

        if (scope === "individual") {
            return Object.entries(byUser).map(([id, v]) => ({ id, ...v }));
        }

        const grouped: Record<string, { name: string; sales: number; gross: number; count: number }> = {};
        for (const g of groups) {
            grouped[g.id] = { name: g.name, sales: 0, gross: 0, count: 0 };
        }
        for (const [uid, v] of Object.entries(byUser)) {
            const u = users.find((x) => x.id === uid);
            const gid = u?.groupId;
            if (!gid || !grouped[gid]) continue;
            grouped[gid].sales += v.sales;
            grouped[gid].gross += v.gross;
            grouped[gid].count += v.count;
        }
        return Object.entries(grouped).map(([id, v]) => ({ id, ...v }));
    }, [sales, users, groups, scope]);

    const sorted = useMemo(() => {
        const list = [...rows];
        const dir = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "name":
                    cmp = a.name.localeCompare(b.name, "ja");
                    break;
                case "sales":
                    cmp = a.sales - b.sales;
                    break;
                case "gross":
                    cmp = a.gross - b.gross;
                    break;
                case "count":
                    cmp = a.count - b.count;
                    break;
                default:
                    return 0;
            }
            if (cmp !== 0) return cmp * dir;
            return a.id.localeCompare(b.id);
        });
        return list;
    }, [rows, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
        }
    };

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href="/sales" className="text-sm text-blue-600 hover:underline">
                                ← 売上管理
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">期間別集計</h1>
                        <p className="text-gray-400 text-sm mt-1">指定した期間の売上・粗利・件数を、個人別またはグループ別に並べ替えて表示します。</p>
                    </div>
                </div>

                <div className="card p-4 flex flex-col lg:flex-row flex-wrap gap-4 lg:items-end">
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-gray-500 mb-1">期間</span>
                        <div className="flex flex-wrap items-center gap-2">
                            <input type="date" className="form-input text-sm w-auto min-w-0 flex-1 sm:flex-none" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400">〜</span>
                            <input type="date" className="form-input text-sm w-auto min-w-0 flex-1 sm:flex-none" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-gray-500 mb-1">集計単位</span>
                        <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 w-fit max-w-full">
                            {(["individual", "group"] as const).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setScope(s)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap ${scope === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
                                >
                                    {s === "individual" ? "個人" : "グループ"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">読み込み中...</div>
                ) : (
                    <div className="overflow-x-auto touch-pan-x">
                        <table className="data-table min-w-[520px]">
                            <thead>
                                <tr>
                                    <ReportSortTh column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort}>
                                        {scope === "individual" ? "担当者" : "グループ"}
                                    </ReportSortTh>
                                    <ReportSortTh column="sales" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" alignEnd>
                                        売上（按分）
                                    </ReportSortTh>
                                    <ReportSortTh column="gross" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" alignEnd>
                                        粗利（按分）
                                    </ReportSortTh>
                                    <ReportSortTh column="count" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} className="text-right" alignEnd>
                                        件数
                                    </ReportSortTh>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((r) => (
                                    <tr key={r.id}>
                                        <td className="font-medium text-sm">
                                            {scope === "individual" ? (
                                                <Link href={`/users/${r.id}`} className="text-blue-700 hover:underline">
                                                    {r.name}
                                                </Link>
                                            ) : (
                                                r.name
                                            )}
                                        </td>
                                        <td className="text-right text-sm font-bold">¥{Math.round(r.sales).toLocaleString("ja-JP")}</td>
                                        <td className="text-right text-sm font-bold text-blue-700">¥{Math.round(r.gross).toLocaleString("ja-JP")}</td>
                                        <td className="text-right text-sm">{r.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
                    件数は担当者として紐づく契約の件数です。売上・粗利は粗利配分比率（未設定時は均等）で按分した合計です。
                </p>
            </div>
        </div>
    );
}
