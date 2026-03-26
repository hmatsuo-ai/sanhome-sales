"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

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
    const [showOnlyUnsettled, setShowOnlyUnsettled] = useState(false);
    const [selectedSummaryUserId, setSelectedSummaryUserId] = useState<string>("");

    const fetchUsers = async () => {
        const r = await fetch("/api/users");
        const d = await r.json();
        setUsers(Array.isArray(d) ? d : []);
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
        fetchSales();
    }, []);

    useEffect(() => {
        if (currentUser && !selectedSummaryUserId) {
            setSelectedSummaryUserId(currentUser.id);
        }
    }, [currentUser, selectedSummaryUserId]);

    // Local Filtering
    const filteredSalesPeriod = useMemo(() => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        return sales.filter(s => {
            const time = new Date(s.date).getTime();
            return time >= start && time <= end;
        });
    }, [sales, startDate, endDate]);

    const mainSales = filteredSalesPeriod.filter(s => s.category === "事業利益" || s.category === "仲介");
    const chintaiSales = filteredSalesPeriod.filter(s => s.category === "いい部屋ネット");

    const displayListScope = activeTab === "main" ? mainSales : chintaiSales;
    const listToDisplay = useMemo(() => {
        if (showOnlyUnsettled) {
            return displayListScope.filter(s => !s.isSettled);
        }
        return displayListScope;
    }, [displayListScope, showOnlyUnsettled]);

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

    const selectedPeriodStats = periodPersonalStatsMap[selectedSummaryUserId] || { name: "", gross: 0, count: 0 };
    const selectedHalfStats = halfYearPersonalStatsMap[selectedSummaryUserId] || { name: "", gross: 0, count: 0 };

    const handleSave = async () => {
        if (!currentUser) return;
        if (form.assigneeIds.length === 0) {
            alert("担当者を1名以上選択してください");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.id,
                    ...form,
                    salesAmount: Number(form.salesAmount),
                    grossProfit: Number(form.grossProfit),
                }),
            });
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm(currentUser.id));
                fetchSales();
            }
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

                    <input type="date" className="form-input text-sm" style={{ width: "auto" }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span className="text-gray-400 text-sm">〜</span>
                    <input type="date" className="form-input text-sm" style={{ width: "auto" }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                    <button className="btn btn-primary" onClick={() => { setForm(emptyForm(currentUser?.id)); setShowModal(true); }} id="add-sale-btn">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        新規登録
                    </button>
                </div>
            </div>

            {/* Aggregation Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col gap-4">
                    <div className={`card border-l-4 ${activeTab === "main" ? "border-l-blue-500" : "border-l-emerald-500"}`}>
                        <h2 className="text-sm font-bold text-gray-800 mb-4">全体サマリー（選択期間）</h2>
                        <div className="flex justify-between items-end mb-3">
                            <p className="text-sm text-gray-500">全体売上</p>
                            <p className="text-2xl font-bold text-gray-900">¥{periodStats.sales.toLocaleString("ja-JP")}</p>
                        </div>
                        <div className="flex justify-between items-end">
                            <p className="text-sm text-gray-500">全体粗利</p>
                            <p className="text-2xl font-bold text-gray-900">¥{periodStats.gross.toLocaleString("ja-JP")}</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 card p-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-gray-800">個人別サマリー</h2>
                            {selectedSummaryUserId && (
                                <Link href={`/users/${selectedSummaryUserId}`} className="text-[10px] text-blue-600 hover:underline">詳細を表示</Link>
                            )}
                        </div>
                        <select
                            className="form-input text-xs py-1 px-2 pr-8 h-auto w-auto"
                            value={selectedSummaryUserId}
                            onChange={(e) => setSelectedSummaryUserId(e.target.value)}
                        >
                            {summaryUserOptions.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center">
                            <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wider">選択期間（粗利配分）</p>
                            <div className="flex justify-between items-end">
                                <p className="text-xs text-gray-500">粗利</p>
                                <p className="text-2xl font-bold text-blue-700">¥{selectedPeriodStats.gross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100 flex flex-col justify-center">
                            <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wider">半期通算（粗利配分）</p>
                            <div className="flex justify-between items-end">
                                <p className="text-xs text-gray-500">粗利</p>
                                <p className="text-2xl font-bold text-emerald-700">¥{selectedHalfStats.gross.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                    <h2 className="font-bold text-gray-800">
                        {activeTab === "main" ? "メイン売上 一覧" : "いい部屋ネット 一覧"}
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-gray-200">
                        <input type="checkbox" className="w-4 h-4 rounded text-orange-500 focus:ring-orange-200" checked={showOnlyUnsettled} onChange={(e) => setShowOnlyUnsettled(e.target.checked)} />
                        <span className="text-sm font-medium text-gray-700">未決済のみ表示</span>
                    </label>
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
                                    <th>契約日</th>
                                    <th>担当者</th>
                                    <th>案件名</th>
                                    {activeTab === "main" && <th>カテゴリ</th>}
                                    <th className="text-right">売上(総額)</th>
                                    <th className="text-right">粗利(総額)</th>
                                    <th className="text-center">決済日</th>
                                    <th className="text-center">決済状況</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listToDisplay.map((s) => (
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
                                            <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 p-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            className="w-full text-right py-1 px-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                            placeholder="割合"
                                                            value={(form.profitRatios[u.id] || 0) * 100}
                                                            onChange={e => {
                                                                const val = Number(e.target.value) / 100;
                                                                setForm({ ...form, profitRatios: { ...form.profitRatios, [u.id]: val } });
                                                            }}
                                                        />
                                                        <span className="text-xs text-gray-400">%</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">※割合を指定しない場合、または合計が100%でない場合は均等に分割されます。</p>
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
                                    <input type="number" className="form-input" value={form.salesAmount} onChange={e => setForm({ ...form, salesAmount: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label text-blue-700">粗利金額</label>
                                    <input type="number" className="form-input border-blue-200" value={form.grossProfit} onChange={e => setForm({ ...form, grossProfit: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 pt-4 border-t">
                            <button className="btn btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                                {saving ? "保存中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
