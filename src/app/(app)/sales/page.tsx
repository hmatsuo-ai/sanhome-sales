"use client";

import { useAuth } from "@/contexts/AuthContext";
import { resolveUserId } from "@/lib/resolveUserId";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { normalizeToHalfWidthNumeric } from "@/lib/normalizeNumericInput";

const CATEGORIES = ["いい部屋ネット", "仲介", "事業利益"] as const;
type Cat = (typeof CATEGORIES)[number];

const CAT_BADGE: Record<Cat, string> = {
    "いい部屋ネット": "cat-iiyaheyanetto",
    仲介: "cat-chukai",
    事業利益: "cat-jigyorieki",
};

interface User {
    id: string;
    name: string;
    groupId?: string | null;
    group?: { id: string; name: string } | null;
}

interface Sale {
    id: string;
    userId: string;
    date: string;
    projectName: string;
    category: string;
    salesAmount: number;
    grossProfit: number;
    settlementDate: string;
    isSettled: boolean;
    profitRatios?: string;
    user: User;
    assignees: User[];
}

interface SaleForm {
    date: string;
    projectName: string;
    category: Cat;
    salesAmount: string;
    grossProfit: string;
    settlementDate: string;
    assigneeIds: string[];
    profitRatios: Record<string, number>; // { userId: percentage_as_decimal }
}

const emptyForm = (currentUserId?: string): SaleForm => ({
    date: format(new Date(), "yyyy-MM-dd"),
    projectName: "",
    category: "事業利益",
    salesAmount: "",
    grossProfit: "",
    settlementDate: format(new Date(), "yyyy-MM-dd"),
    assigneeIds: currentUserId ? [currentUserId] : [],
    profitRatios: {},
});

type ViewTab = "main" | "chintai";

export default function SalesPage() {
    const { currentUser } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<SaleForm>(emptyForm(currentUser?.id));
    const [saving, setSaving] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [activeTab, setActiveTab] = useState<ViewTab>("main");
    const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
    const [filterProjectNames, setFilterProjectNames] = useState<string[]>([]);
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [filterSettlementStatus, setFilterSettlementStatus] = useState<"all" | "settled" | "unsettled">("all");
    const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false);
    const [projectFilterOpen, setProjectFilterOpen] = useState(false);
    const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
    const [settlementFilterOpen, setSettlementFilterOpen] = useState(false);
    const assigneeFilterRef = useRef<HTMLDivElement>(null);
    const projectFilterRef = useRef<HTMLDivElement>(null);
    const categoryFilterRef = useRef<HTMLDivElement>(null);
    const settlementFilterRef = useRef<HTMLDivElement>(null);
    type SummaryMode = "total" | "group" | "individual";
    const [summaryMode, setSummaryMode] = useState<SummaryMode>("individual");
    const [selectedSummaryUserId, setSelectedSummaryUserId] = useState<string>("");
    const [selectedSummaryGroupId, setSelectedSummaryGroupId] = useState<string>("");
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
    type SalesSortKey = "date" | "assignees" | "projectName" | "category" | "settlementDate" | "isSettled";
    const [salesSortKey, setSalesSortKey] = useState<SalesSortKey>("date");
    const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");

    const fetchUsers = async () => {
        const r = await fetch("/api/users");
        const d = await r.json();
        setUsers(Array.isArray(d) ? d : []);
    };

    const fetchGroups = async () => {
        const r = await fetch("/api/groups");
        const d = await r.json();
        setGroups(Array.isArray(d) ? d : []);
    };

    const fetchSales = () => {
        setLoading(true);
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        let fyStart, fyEnd;
        if (month >= 4 && month <= 9) {
            fyStart = `${year}-04-01`;
            fyEnd = `${year}-09-30`;
        } else if (month >= 10) {
            fyStart = `${year}-10-01`;
            fyEnd = `${year + 1}-03-31`;
        } else {
            fyStart = `${year - 1}-10-01`;
            fyEnd = `${year}-03-31`;
        }

        fetch(`/api/sales?startDate=${fyStart}&endDate=${fyEnd}`)
            .then((r) => r.json())
            .then((d) => setSales(Array.isArray(d) ? d : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
        fetchGroups();
        fetchSales();
    }, []);

    useEffect(() => {
        if (currentUser && !selectedSummaryUserId) {
            setSelectedSummaryUserId(currentUser.id);
        }
    }, [currentUser, selectedSummaryUserId]);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (assigneeFilterRef.current && !assigneeFilterRef.current.contains(e.target as Node)) setAssigneeFilterOpen(false);
            if (projectFilterRef.current && !projectFilterRef.current.contains(e.target as Node)) setProjectFilterOpen(false);
            if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) setCategoryFilterOpen(false);
            if (settlementFilterRef.current && !settlementFilterRef.current.contains(e.target as Node)) setSettlementFilterOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // Local Filtering
    const filteredSalesPeriod = useMemo(() => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        return sales.filter(s => {
            const time = new Date(s.date).getTime();
            return time >= start && time <= end;
        });
    }, [sales, startDate, endDate]);

    const mainSales = useMemo(
        () => filteredSalesPeriod.filter(s => s.category === "事業利益" || s.category === "仲介"),
        [filteredSalesPeriod]
    );
    const chintaiSales = useMemo(
        () => filteredSalesPeriod.filter(s => s.category === "いい部屋ネット"),
        [filteredSalesPeriod]
    );

    const displayListScope = useMemo(
        () => (activeTab === "main" ? mainSales : chintaiSales),
        [activeTab, mainSales, chintaiSales]
    );

    // 案件名の選択肢：取得済みの売上全体をタブで絞ったものから作成（新規登録のたびに選択肢が増える）
    const salesInTabForProjectOptions = useMemo(
        () => sales.filter(s =>
            activeTab === "main" ? (s.category === "事業利益" || s.category === "仲介") : s.category === "いい部屋ネット"
        ),
        [sales, activeTab]
    );

    const uniqueAssignees = useMemo(() => {
        const seen = new Set<string>();
        const list: User[] = [];
        displayListScope.forEach(s => {
            s.assignees?.forEach(a => {
                if (!seen.has(a.id)) { seen.add(a.id); list.push(a); }
            });
        });
        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }, [displayListScope]);

    const uniqueProjectNames = useMemo(() => {
        const names = [...new Set(salesInTabForProjectOptions.map(s => (s.projectName || "").trim()).filter(Boolean))];
        return names.sort((a, b) => a.localeCompare(b));
    }, [salesInTabForProjectOptions]);

    const uniqueCategories = useMemo(() => {
        const cats = [...new Set(displayListScope.map(s => s.category).filter(Boolean))];
        return cats.sort((a, b) => a.localeCompare(b));
    }, [displayListScope]);

    const listToDisplay = useMemo(() => {
        let list = displayListScope;
        if (filterAssigneeIds.length > 0) {
            list = list.filter(s => s.assignees?.some(a => filterAssigneeIds.includes(a.id)));
        }
        if (filterProjectNames.length > 0) {
            list = list.filter(s => filterProjectNames.includes((s.projectName || "").trim()));
        }
        if (filterCategories.length > 0) {
            list = list.filter(s => filterCategories.includes(s.category));
        }
        if (filterSettlementStatus === "settled") list = list.filter(s => s.isSettled);
        if (filterSettlementStatus === "unsettled") list = list.filter(s => !s.isSettled);
        return list;
    }, [displayListScope, filterAssigneeIds, filterProjectNames, filterCategories, filterSettlementStatus]);

    const sortedSales = useMemo(() => {
        const list = [...listToDisplay];
        const isDateCol = salesSortKey === "date" || salesSortKey === "settlementDate";
        const dir = isDateCol ? (dateSortDir === "asc" ? 1 : -1) : 1;
        const safeDate = (d: string) => {
            const t = new Date(d).getTime();
            return Number.isNaN(t) ? 0 : t;
        };
        list.sort((a, b) => {
            let cmp = 0;
            switch (salesSortKey) {
                case "date":
                    cmp = safeDate(a.date) - safeDate(b.date);
                    break;
                case "assignees":
                    cmp = (a.assignees?.[0]?.name ?? "").localeCompare(b.assignees?.[0]?.name ?? "");
                    break;
                case "projectName":
                    cmp = (a.projectName || "").localeCompare(b.projectName || "");
                    break;
                case "category":
                    cmp = (a.category || "").localeCompare(b.category || "");
                    break;
                case "settlementDate":
                    cmp = safeDate(a.settlementDate || "") - safeDate(b.settlementDate || "");
                    break;
                case "isSettled":
                    cmp = (a.isSettled ? 1 : 0) - (b.isSettled ? 1 : 0);
                    break;
                default:
                    return 0;
            }
            if (cmp !== 0) return cmp * dir;
            return a.id.localeCompare(b.id);
        });
        return list;
    }, [listToDisplay, salesSortKey, dateSortDir]);

    const handleSalesSort = (key: SalesSortKey) => {
        if (key === "date" || key === "settlementDate") {
            if (salesSortKey === key) {
                setDateSortDir(d => d === "asc" ? "desc" : "asc");
            } else {
                setSalesSortKey(key);
            }
        } else {
            setSalesSortKey(key);
        }
    };

    const SalesSortTh = ({ sortKey, children, className }: { sortKey: SalesSortKey; children: React.ReactNode; className?: string }) => {
        const isActive = salesSortKey === sortKey;
        const isDateCol = sortKey === "date" || sortKey === "settlementDate";
        const desc = isDateCol ? (dateSortDir === "desc") : false;
        const ariaSort = !isActive ? undefined : (desc ? "descending" as const : "ascending" as const);
        return (
            <th
                role="columnheader"
                aria-sort={ariaSort}
                className={`cursor-pointer select-none hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap touch-manipulation ${className || ""}`}
                onClick={() => handleSalesSort(sortKey)}
            >
                <span className="inline-flex items-center gap-1">
                    {children}
                    <span className="text-gray-400" aria-hidden>
                        {isActive ? (desc ? "▼" : "▲") : "⇅"}
                    </span>
                </span>
            </th>
        );
    };

    const FilterTh = ({
        label,
        open,
        setOpen,
        refEl,
        selectedLabel,
        children,
        className,
    }: {
        label: string;
        open: boolean;
        setOpen: (v: boolean) => void;
        refEl: React.RefObject<HTMLDivElement | null>;
        selectedLabel?: string;
        children: React.ReactNode;
        className?: string;
    }) => (
        <th className={`whitespace-nowrap ${className || ""}`}>
            <div className="relative inline-block" ref={refEl}>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="inline-flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-100 text-left"
                >
                    <span>{label}</span>
                    {selectedLabel && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {selectedLabel}
                        </span>
                    )}
                    <svg className={`w-4 h-4 text-gray-400 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {open && (
                    <div className="absolute left-0 top-full mt-1 z-20 min-w-[180px] py-2 bg-white rounded-xl border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
                        {children}
                    </div>
                )}
            </div>
        </th>
    );

    const totalRatioPct = form.assigneeIds.reduce((sum, id) => sum + (form.profitRatios[id] ?? 0), 0);
    const isTotal100 = form.assigneeIds.length > 0 && Math.abs(totalRatioPct - 1) < 0.0001;

    const calcStats = (arr: Sale[]) => ({
        sales: arr.reduce((acc, s) => acc + s.salesAmount, 0),
        gross: arr.reduce((acc, s) => acc + s.grossProfit, 0)
    });

    const periodStats = calcStats(activeTab === "main" ? mainSales : chintaiSales);
    const halfYearStats = calcStats(sales.filter(s => activeTab === "main" ? (s.category === "事業利益" || s.category === "仲介") : s.category === "いい部屋ネット"));

    // Personal Summary Calculations (Divided by assignees)
    const calculatePersonalStats = (saleArr: Sale[]) => {
        const acc: Record<string, { name: string; gross: number; count: number }> = {};
        saleArr.forEach(s => {
            const ratios: Record<string, number> = s.profitRatios ? JSON.parse(s.profitRatios) : {};
            const numAssignees = s.assignees.length || 1;

            s.assignees.forEach(u => {
                if (!acc[u.id]) acc[u.id] = { name: u.name, gross: 0, count: 0 };

                // Use custom ratio if exists, otherwise split equally
                const ratio = ratios[u.id] !== undefined ? ratios[u.id] : (1 / numAssignees);
                const splitGross = s.grossProfit * ratio;

                acc[u.id].gross += splitGross;
                acc[u.id].count += 1;
            });
        });
        return acc;
    };

    const periodPersonalStatsMap = calculatePersonalStats(activeTab === "main" ? mainSales : chintaiSales);
    const halfYearPersonalStatsMap = calculatePersonalStats(sales.filter(s => activeTab === "main" ? (s.category === "事業利益" || s.category === "仲介") : s.category === "いい部屋ネット"));

    const summaryUserOptions = useMemo(() => {
        const ids = new Set([...Object.keys(periodPersonalStatsMap), ...Object.keys(halfYearPersonalStatsMap)]);
        if (currentUser) ids.add(currentUser.id);
        return Array.from(ids).map(id => {
            const u = users.find(user => user.id === id);
            return { id, name: u?.name || "不明" };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [periodPersonalStatsMap, halfYearPersonalStatsMap, currentUser, users]);

    // 賃貸/事業利益タブ切替時、現在の選択がそのタブの選択肢に含まれていなければ有効な値に合わせる
    useEffect(() => {
        if (summaryUserOptions.length === 0) return;
        const ids = summaryUserOptions.map(o => o.id);
        if (ids.includes(selectedSummaryUserId)) return;
        const nextId = currentUser && ids.includes(currentUser.id) ? currentUser.id : ids[0];
        setSelectedSummaryUserId(nextId);
    }, [activeTab, summaryUserOptions, selectedSummaryUserId, currentUser]);

    const selectedPeriodStats = periodPersonalStatsMap[selectedSummaryUserId] || { name: "", gross: 0, count: 0 };
    const selectedHalfStats = halfYearPersonalStatsMap[selectedSummaryUserId] || { name: "", gross: 0, count: 0 };

    // グループ別集計（そのグループに属するユーザーの粗利配分を合算）
    const groupPeriodGross = useMemo(() => {
        if (!selectedSummaryGroupId) return 0;
        const userIdsInGroup = users.filter(u => u.groupId === selectedSummaryGroupId).map(u => u.id);
        return userIdsInGroup.reduce((sum, id) => sum + (periodPersonalStatsMap[id]?.gross ?? 0), 0);
    }, [users, selectedSummaryGroupId, periodPersonalStatsMap]);
    const groupHalfGross = useMemo(() => {
        if (!selectedSummaryGroupId) return 0;
        const userIdsInGroup = users.filter(u => u.groupId === selectedSummaryGroupId).map(u => u.id);
        return userIdsInGroup.reduce((sum, id) => sum + (halfYearPersonalStatsMap[id]?.gross ?? 0), 0);
    }, [users, selectedSummaryGroupId, halfYearPersonalStatsMap]);

    // グループ未選択時は先頭を選択
    useEffect(() => {
        if (summaryMode !== "group" || groups.length === 0) return;
        if (selectedSummaryGroupId && groups.some(g => g.id === selectedSummaryGroupId)) return;
        setSelectedSummaryGroupId(groups[0].id);
    }, [summaryMode, groups, selectedSummaryGroupId]);

    const handleSave = async () => {
        const userId = await resolveUserId(currentUser?.id);
        if (!userId) {
            alert("ログイン情報を読み込み中です。しばらく待ってからもう一度お試しください。");
            return;
        }
        if (form.assigneeIds.length === 0) {
            alert("担当者を1名以上選択してください");
            return;
        }
        const totalRatio = form.assigneeIds.reduce((sum, id) => sum + (form.profitRatios[id] ?? 0), 0);
        const is100 = Math.abs(totalRatio - 1) < 0.0001;
        if (!is100) {
            alert("配分比率の合計を100%にしてください。");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    ...form,
                    salesAmount: Number(form.salesAmount),
                    grossProfit: Number(form.grossProfit),
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm(userId));
                fetchSales();
            } else {
                alert(data.error || "売上の保存に失敗しました。");
            }
        } catch (e) {
            alert("通信エラーが発生しました。");
        } finally {
            setSaving(false);
        }
    };

    const toggleSettled = async (sale: Sale) => {
        try {
            const res = await fetch(`/api/sales/${sale.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isSettled: !sale.isSettled }),
            });
            if (res.ok) fetchSales();
        } catch (error) {
            console.error("Toggle settled error:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("この売上データを削除しますか？")) return;
        const res = await fetch(`/api/sales/${id}`, { method: "DELETE" });
        if (res.ok) fetchSales();
    };

    return (
        <div>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">売上管理</h1>
                    <p className="text-gray-400 text-sm mt-1">売上・粗利の記録と集計（複数担当者に対応）</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "main" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            onClick={() => setActiveTab("main")}
                        >
                            事業利益・仲介
                        </button>
                        <button
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "chintai" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            onClick={() => setActiveTab("chintai")}
                        >
                            賃貸（いい部屋）
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>

                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 mb-1">表示する期間</span>
                        <div className="flex items-center gap-1">
                            <input type="date" className="form-input text-sm" style={{ width: "auto" }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span className="text-gray-400 text-sm">〜</span>
                            <input type="date" className="form-input text-sm" style={{ width: "auto" }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => { setForm(emptyForm(currentUser?.id)); setShowModal(true); }} id="add-sale-btn">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        新規登録
                    </button>
                </div>
            </div>

            {/* サマリー（全体・グループ・個人の切替） */}
            <div className="card p-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4">
                    <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
                        {(["total", "group", "individual"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setSummaryMode(mode)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${summaryMode === mode ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                {mode === "total" ? "全体" : mode === "group" ? "グループ" : "個人"}
                            </button>
                        ))}
                    </div>
                    {summaryMode === "group" && (
                        <select
                            className="form-input text-sm py-1.5 px-3 pr-8 h-auto w-auto"
                            value={selectedSummaryGroupId}
                            onChange={(e) => setSelectedSummaryGroupId(e.target.value)}
                        >
                            {groups.length === 0 ? (
                                <option value="">グループがありません</option>
                            ) : (
                                groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                            )}
                        </select>
                    )}
                    {summaryMode === "individual" && (
                        <div className="flex items-center gap-2">
                            {selectedSummaryUserId && (
                                <Link href={`/users/${selectedSummaryUserId}`} className="text-xs text-blue-600 hover:underline">詳細を表示</Link>
                            )}
                            <select
                                className="form-input text-sm py-1.5 px-3 pr-8 h-auto w-auto"
                                value={selectedSummaryUserId}
                                onChange={(e) => setSelectedSummaryUserId(e.target.value)}
                            >
                                {summaryUserOptions.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {summaryMode === "total" && (
                        <>
                            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center">
                                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">選択期間（全体）</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-gray-500">売上</p>
                                        <p className="text-xl font-bold text-gray-900">¥{periodStats.sales.toLocaleString("ja-JP")}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-gray-500">粗利</p>
                                        <p className="text-xl font-bold text-gray-900">¥{periodStats.gross.toLocaleString("ja-JP")}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-100/70 rounded-lg p-4 border border-slate-200 flex flex-col justify-center dark:bg-[var(--color-surface-elevated)] dark:border-[var(--color-border)]">
                                <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider dark:text-[var(--color-text-muted)]">半期通算（全体）</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-gray-500">売上</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-[var(--color-text)]">¥{halfYearStats.sales.toLocaleString("ja-JP")}</p>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-gray-500">粗利</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-[var(--color-text)]">¥{halfYearStats.gross.toLocaleString("ja-JP")}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {summaryMode === "group" && (
                        <>
                            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center">
                                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">選択期間（粗利配分）</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-gray-500">粗利</p>
                                    <p className="text-2xl font-bold text-blue-700">¥{groupPeriodGross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                            <div className="bg-slate-100/70 rounded-lg p-4 border border-slate-200 flex flex-col justify-center dark:bg-[var(--color-surface-elevated)] dark:border-[var(--color-border)]">
                                <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider dark:text-[var(--color-text-muted)]">半期通算（粗利配分）</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-gray-500">粗利</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-[var(--color-text)]">¥{groupHalfGross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                        </>
                    )}
                    {summaryMode === "individual" && (
                        <>
                            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center">
                                <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">選択期間（粗利配分）</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-gray-500">粗利</p>
                                    <p className="text-2xl font-bold text-blue-700">¥{selectedPeriodStats.gross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                            <div className="bg-slate-100/70 rounded-lg p-4 border border-slate-200 flex flex-col justify-center dark:bg-[var(--color-surface-elevated)] dark:border-[var(--color-border)]">
                                <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider dark:text-[var(--color-text-muted)]">半期通算（粗利配分）</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-xs text-gray-500">粗利</p>
                                    <p className="text-2xl font-bold text-slate-800 dark:text-[var(--color-text)]">¥{selectedHalfStats.gross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-bold text-gray-800">
                        {activeTab === "main" ? "メイン売上 一覧" : "いい部屋ネット 一覧"}
                    </h2>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">読み込み中...</div>
                ) : listToDisplay.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">データがありません</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <SalesSortTh sortKey="date">契約日</SalesSortTh>
                                    <FilterTh
                                        label="担当者"
                                        open={assigneeFilterOpen}
                                        setOpen={setAssigneeFilterOpen}
                                        refEl={assigneeFilterRef}
                                        selectedLabel={filterAssigneeIds.length > 0 ? String(filterAssigneeIds.length) : undefined}
                                    >
                                        <div className="px-2 pb-1 border-b border-gray-100">
                                            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => { setFilterAssigneeIds([]); setAssigneeFilterOpen(false); }}>すべて</button>
                                        </div>
                                        {uniqueAssignees.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filterAssigneeIds.length === 0 || filterAssigneeIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (filterAssigneeIds.length === 0) setFilterAssigneeIds(uniqueAssignees.filter(x => x.id !== u.id).map(x => x.id));
                                                        else if (e.target.checked) setFilterAssigneeIds([...filterAssigneeIds, u.id]);
                                                        else setFilterAssigneeIds(filterAssigneeIds.filter(id => id !== u.id));
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm">{u.name}</span>
                                            </label>
                                        ))}
                                    </FilterTh>
                                    <FilterTh
                                        label="案件名"
                                        open={projectFilterOpen}
                                        setOpen={setProjectFilterOpen}
                                        refEl={projectFilterRef}
                                        selectedLabel={filterProjectNames.length > 0 ? String(filterProjectNames.length) : undefined}
                                    >
                                        <div className="px-2 pb-1 border-b border-gray-100">
                                            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => { setFilterProjectNames([]); setProjectFilterOpen(false); }}>すべて</button>
                                        </div>
                                        {uniqueProjectNames.map(name => (
                                            <label key={name} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filterProjectNames.length === 0 || filterProjectNames.includes(name)}
                                                    onChange={(e) => {
                                                        if (filterProjectNames.length === 0) setFilterProjectNames(uniqueProjectNames.filter(n => n !== name));
                                                        else if (e.target.checked) setFilterProjectNames([...filterProjectNames, name]);
                                                        else setFilterProjectNames(filterProjectNames.filter(n => n !== name));
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm truncate max-w-[200px]">{name}</span>
                                            </label>
                                        ))}
                                    </FilterTh>
                                    {activeTab === "main" && (
                                        <FilterTh
                                            label="カテゴリ"
                                            open={categoryFilterOpen}
                                            setOpen={setCategoryFilterOpen}
                                            refEl={categoryFilterRef}
                                            selectedLabel={filterCategories.length > 0 ? String(filterCategories.length) : undefined}
                                        >
                                            <div className="px-2 pb-1 border-b border-gray-100">
                                                <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => { setFilterCategories([]); setCategoryFilterOpen(false); }}>すべて</button>
                                            </div>
                                            {uniqueCategories.map(cat => (
                                                <label key={cat} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={filterCategories.length === 0 || filterCategories.includes(cat)}
                                                        onChange={(e) => {
                                                            if (filterCategories.length === 0) setFilterCategories(uniqueCategories.filter(c => c !== cat));
                                                            else if (e.target.checked) setFilterCategories([...filterCategories, cat]);
                                                            else setFilterCategories(filterCategories.filter(c => c !== cat));
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300"
                                                    />
                                                    <span className="text-sm">{cat}</span>
                                                </label>
                                            ))}
                                        </FilterTh>
                                    )}
                                    <th className="text-right">売上(総額)</th>
                                    <th className="text-right">粗利(総額)</th>
                                    <SalesSortTh sortKey="settlementDate" className="text-center">決済日</SalesSortTh>
                                    <FilterTh
                                        label="決済状況"
                                        open={settlementFilterOpen}
                                        setOpen={setSettlementFilterOpen}
                                        refEl={settlementFilterRef}
                                        selectedLabel={filterSettlementStatus === "all" ? undefined : filterSettlementStatus === "settled" ? "決済済" : "未決済"}
                                        className="text-center"
                                    >
                                        <div className="px-2 pb-1 border-b border-gray-100">
                                            <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => { setFilterSettlementStatus("all"); setSettlementFilterOpen(false); }}>すべて</button>
                                        </div>
                                        <button type="button" className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-sm" onClick={() => { setFilterSettlementStatus("settled"); setSettlementFilterOpen(false); }}>
                                            {filterSettlementStatus === "settled" && "✓ "}決済済み
                                        </button>
                                        <button type="button" className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left text-sm" onClick={() => { setFilterSettlementStatus("unsettled"); setSettlementFilterOpen(false); }}>
                                            {filterSettlementStatus === "unsettled" && "✓ "}未決済
                                        </button>
                                    </FilterTh>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedSales.map((s) => (
                                    <tr key={s.id} className={!s.isSettled ? "bg-orange-50/30" : ""}>
                                        <td className="text-sm whitespace-nowrap">{format(new Date(s.date), "yyyy/MM/dd")}</td>
                                        <td className="text-sm">
                                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                {s.assignees.map(a => (
                                                    <span key={a.id} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{a.name}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="text-sm font-medium truncate max-w-[150px]">{s.projectName}</td>
                                        {activeTab === "main" && (
                                            <td><span className={`badge ${CAT_BADGE[s.category as Cat]}`}>{s.category}</span></td>
                                        )}
                                        <td className="text-sm font-bold text-right">¥{s.salesAmount.toLocaleString()}</td>
                                        <td className="text-sm font-bold text-right text-blue-700">¥{s.grossProfit.toLocaleString()}</td>
                                        <td className="text-center text-xs text-gray-500">
                                            {s.settlementDate ? format(new Date(s.settlementDate), "yyyy/MM/dd") : "-"}
                                        </td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => toggleSettled(s)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${s.isSettled ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                                            >
                                                {s.isSettled ? "決済済" : "未決済"}
                                            </button>
                                        </td>
                                        <td>
                                            <button type="button" onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 p-1" title="削除">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4 border-b pb-2">売上データ登録</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">契約日</label>
                                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">決済日 (必須)</label>
                                    <input type="date" className="form-input" value={form.settlementDate} onChange={e => setForm({ ...form, settlementDate: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">担当者と配分比率 (%)</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                    {users.map(u => {
                                        const isSelected = form.assigneeIds.includes(u.id);
                                        return (
                                            <div key={u.id} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={isSelected}
                                                        onChange={e => {
                                                            let nextIds;
                                                            let nextRatios = { ...form.profitRatios };
                                                            if (e.target.checked) {
                                                                nextIds = [...form.assigneeIds, u.id];
                                                                // Default to equal split if not first, or 100% if first
                                                                nextRatios[u.id] = nextIds.length === 1 ? 1 : 0;
                                                            } else {
                                                                nextIds = form.assigneeIds.filter(id => id !== u.id);
                                                                delete nextRatios[u.id];
                                                            }
                                                            setForm({ ...form, assigneeIds: nextIds, profitRatios: nextRatios });
                                                        }}
                                                    />
                                                    <span className={`text-sm font-medium ${isSelected ? "text-gray-900" : "text-gray-400"}`}>{u.name}</span>
                                                </label>
                                                {isSelected && (
                                                    <div className="flex items-center gap-1 w-24">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            className="w-full text-right py-1 px-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                            placeholder="割合"
                                                            value={form.profitRatios[u.id] !== undefined && form.profitRatios[u.id] !== null ? String(Math.round(form.profitRatios[u.id] * 100)) : "0"}
                                                            onChange={e => {
                                                                const normalized = normalizeToHalfWidthNumeric(e.target.value).replace(/^0+(\d)|^0+$/, "$1") || "0";
                                                                let num = parseInt(normalized, 10);
                                                                if (Number.isNaN(num) || normalized === "") {
                                                                    setForm({ ...form, profitRatios: { ...form.profitRatios, [u.id]: 0 } });
                                                                    return;
                                                                }
                                                                const maxPct = form.assigneeIds.length === 1 ? 100 : 99;
                                                                if (num > maxPct) num = maxPct;
                                                                if (num < 0) num = 0;
                                                                setForm({ ...form, profitRatios: { ...form.profitRatios, [u.id]: num / 100 } });
                                                            }}
                                                        />
                                                        <span className="text-xs text-gray-400">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">※配分比率の合計が100%でないと登録できません。</p>
                            </div>
                            <div>
                                <label className="form-label">カテゴリ</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(c => (
                                        <button key={c} type="button" onClick={() => setForm({ ...form, category: c })} className={`py-1.5 rounded border text-sm transition-all ${form.category === c ? "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-100" : "bg-white border-gray-200 text-gray-400"}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="form-label">案件名</label>
                                <input type="text" className="form-input" placeholder="○○ビル 101号" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">売上金額</label>
                                    <input type="number" className="form-input" value={form.salesAmount} onChange={e => setForm({ ...form, salesAmount: normalizeToHalfWidthNumeric(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="form-label text-blue-700">粗利金額</label>
                                    <input type="number" className="form-input border-blue-200" value={form.grossProfit} onChange={e => setForm({ ...form, grossProfit: normalizeToHalfWidthNumeric(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4 border-t">
                            <button className="btn btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving || !isTotal100}>
                                {saving ? "保存中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
