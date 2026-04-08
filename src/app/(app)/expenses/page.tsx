"use client";

import { useAuth } from "@/contexts/AuthContext";
import { resolveUserId } from "@/lib/resolveUserId";
import { normalizeToHalfWidthNumeric } from "@/lib/normalizeNumericInput";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const CATEGORIES = [
    "飲食費", "交通費", "駐車場代", "接待費", "消耗品費",
    "宿泊費", "通信費", "書籍・資料", "その他",
];

interface Expense {
    id: string;
    userId: string;
    date: string;
    category: string;
    amount: number;
    receiptImageUrl: string | null;
    memo: string | null;
    user: { id: string; name: string };
}

interface ExpenseForm {
    date: string;
    category: string;
    amount: string;
    memo: string;
    receiptImageUrl: string;
}

const emptyForm = (): ExpenseForm => ({
    date: format(new Date(), "yyyy-MM-dd"),
    category: "飲食費",
    amount: "",
    memo: "",
    receiptImageUrl: "",
});

export default function ExpensesPage() {
    const { currentUser } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<ExpenseForm>(emptyForm());
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const fileRef = useRef<HTMLInputElement>(null);
    const today = new Date();
    const [startDate, setStartDate] = useState(() => format(startOfMonth(today), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(endOfMonth(today), "yyyy-MM-dd"));
    const [dragOver, setDragOver] = useState(false);
    const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
    const [filterCategories, setFilterCategories] = useState<string[]>([]);
    const [userFilterOpen, setUserFilterOpen] = useState(false);
    const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
    const userFilterRef = useRef<HTMLDivElement>(null);
    const categoryFilterRef = useRef<HTMLDivElement>(null);
    type ExpenseSortKey = "date" | "amount" | "memo";
    const [expenseSortKey, setExpenseSortKey] = useState<ExpenseSortKey>("date");
    const [dateSortDir, setDateSortDir] = useState<"asc" | "desc">("desc");

    const fetchExpenses = () => {
        setLoading(true);
        fetch(`/api/expenses?startDate=${startDate}&endDate=${endDate}`)
            .then((r) => r.json())
            .then((data) => setExpenses(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExpenses(); }, [startDate, endDate]); // eslint-disable-line

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (userFilterRef.current && !userFilterRef.current.contains(e.target as Node)) setUserFilterOpen(false);
            if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) setCategoryFilterOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const uniqueUsers = useMemo(() => {
        const seen = new Set<string>();
        const list: { id: string; name: string }[] = [];
        expenses.forEach(e => {
            if (!seen.has(e.userId)) {
                seen.add(e.userId);
                list.push({ id: e.userId, name: e.user.name });
            }
        });
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        return list;
    }, [expenses]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (filterUserIds.length > 0 && !filterUserIds.includes(e.userId)) return false;
            if (filterCategories.length > 0 && !filterCategories.includes(e.category)) return false;
            return true;
        });
    }, [expenses, filterUserIds, filterCategories]);

    const sortedExpenses = useMemo(() => {
        const list = [...filteredExpenses];
        const dir = expenseSortKey === "date"
            ? (dateSortDir === "asc" ? 1 : -1)
            : (expenseSortKey === "amount" ? -1 : 1);
        list.sort((a, b) => {
            let cmp = 0;
            switch (expenseSortKey) {
                case "date":
                    cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case "amount":
                    cmp = a.amount - b.amount;
                    break;
                case "memo":
                    cmp = (a.memo || "").localeCompare(b.memo || "");
                    break;
                default:
                    return 0;
            }
            return cmp * dir;
        });
        return list;
    }, [filteredExpenses, expenseSortKey, dateSortDir]);

    const handleExpenseSort = (key: ExpenseSortKey) => {
        if (key === "date") {
            if (expenseSortKey === "date") {
                setDateSortDir(d => d === "asc" ? "desc" : "asc");
            } else {
                setExpenseSortKey("date");
            }
        } else {
            setExpenseSortKey(key);
        }
    };

    const SortTh = ({ sortKey, children }: { sortKey: ExpenseSortKey; children: React.ReactNode }) => {
        const isActive = expenseSortKey === sortKey;
        const desc = sortKey === "date" ? (dateSortDir === "desc") : sortKey === "amount";
        const ariaSort = !isActive ? undefined : (desc ? "descending" as const : "ascending" as const);
        return (
            <th
                role="columnheader"
                aria-sort={ariaSort}
                className="cursor-pointer select-none hover:bg-gray-100 active:bg-gray-200 whitespace-nowrap touch-manipulation"
                onClick={() => handleExpenseSort(sortKey)}
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
        selectedCount,
        children,
    }: {
        label: string;
        open: boolean;
        setOpen: (v: boolean) => void;
        refEl: React.RefObject<HTMLDivElement | null>;
        selectedCount: number;
        children: React.ReactNode;
    }) => (
        <th className="whitespace-nowrap">
            <div className="relative inline-block" ref={refEl}>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="inline-flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-100 text-left"
                >
                    <span>{label}</span>
                    {selectedCount > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {selectedCount}
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

    const processImage = async (file: File) => {
        setUploading(true);
        // show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                setForm((prev) => ({ ...prev, receiptImageUrl: data.url }));
            } else {
                alert("画像のアップロードに失敗しました");
                setPreviewUrl("");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("画像アップロード中にエラーが発生しました");
            setPreviewUrl("");
        } finally {
            setUploading(false);
        }
    };

    const handleFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        processImage(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleSave = async () => {
        const userId = await resolveUserId(currentUser?.id);
        if (!userId) {
            alert("ログイン情報を読み込み中です。しばらく待ってからもう一度お試しください。");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    date: form.date,
                    category: form.category,
                    amount: Number(form.amount),
                    memo: form.memo,
                    receiptImageUrl: form.receiptImageUrl || null,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm());
                setPreviewUrl("");
                fetchExpenses();
            } else {
                alert(data.error || "経費の保存に失敗しました。");
            }
        } catch (e) {
            alert("通信エラーが発生しました。");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, userId: string) => {
        if (!currentUser || currentUser.id !== userId) return;
        if (!confirm("この経費を削除しますか？")) return;
        await fetch(`/api/expenses/${id}?userId=${currentUser.id}`, { method: "DELETE" });
        fetchExpenses();
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">経費精算</h1>
                        <Link
                            href="/expenses/summary"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5M17 21v-2a2 2 0 00-2-2H9.5M15 7V5a2 2 0 012-2h2" />
                            </svg>
                            個人別合計一覧
                        </Link>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">領収書の登録と管理</p>
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
                    <button
                        type="button"
                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50"
                        onClick={() => {
                            const t = new Date();
                            setStartDate(format(startOfMonth(t), "yyyy-MM-dd"));
                            setEndDate(format(endOfMonth(t), "yyyy-MM-dd"));
                        }}
                    >
                        今月
                    </button>
                    <button
                        className="btn btn-primary"
                        id="add-expense-btn"
                        onClick={() => { setForm(emptyForm()); setPreviewUrl(""); setShowModal(true); }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新規登録
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
                        読み込み中...
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>表示対象の経費データがありません</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <SortTh sortKey="date">日付</SortTh>
                                    <FilterTh
                                        label="担当者"
                                        open={userFilterOpen}
                                        setOpen={setUserFilterOpen}
                                        refEl={userFilterRef}
                                        selectedCount={filterUserIds.length}
                                    >
                                        <div className="px-2 pb-1 border-b border-gray-100">
                                            <button
                                                type="button"
                                                className="text-xs text-blue-600 hover:underline"
                                                onClick={() => { setFilterUserIds([]); setUserFilterOpen(false); }}
                                            >
                                                すべて
                                            </button>
                                        </div>
                                        {uniqueUsers.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filterUserIds.length === 0 || filterUserIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (filterUserIds.length === 0) {
                                                            setFilterUserIds(uniqueUsers.filter(x => x.id !== u.id).map(x => x.id));
                                                        } else if (e.target.checked) {
                                                            setFilterUserIds([...filterUserIds, u.id]);
                                                        } else {
                                                            setFilterUserIds(filterUserIds.filter(id => id !== u.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm">{u.name}</span>
                                            </label>
                                        ))}
                                    </FilterTh>
                                    <FilterTh
                                        label="カテゴリ"
                                        open={categoryFilterOpen}
                                        setOpen={setCategoryFilterOpen}
                                        refEl={categoryFilterRef}
                                        selectedCount={filterCategories.length}
                                    >
                                        <div className="px-2 pb-1 border-b border-gray-100">
                                            <button
                                                type="button"
                                                className="text-xs text-blue-600 hover:underline"
                                                onClick={() => { setFilterCategories([]); setCategoryFilterOpen(false); }}
                                            >
                                                すべて
                                            </button>
                                        </div>
                                        {CATEGORIES.map(cat => (
                                            <label key={cat} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={filterCategories.length === 0 || filterCategories.includes(cat)}
                                                    onChange={(e) => {
                                                        if (filterCategories.length === 0) {
                                                            setFilterCategories(CATEGORIES.filter(c => c !== cat));
                                                        } else if (e.target.checked) {
                                                            setFilterCategories([...filterCategories, cat]);
                                                        } else {
                                                            setFilterCategories(filterCategories.filter(c => c !== cat));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                                <span className="text-sm">{cat}</span>
                                            </label>
                                        ))}
                                    </FilterTh>
                                    <SortTh sortKey="amount">金額</SortTh>
                                    <SortTh sortKey="memo">メモ</SortTh>
                                    <th>領収書</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-gray-400">
                                                選択した条件に該当する経費はありません
                                            </td>
                                        </tr>
                                ) : sortedExpenses.map((e) => (
                                        <tr key={e.id}>
                                            <td className="text-sm whitespace-nowrap">
                                                {format(new Date(e.date), "M/d(EEE)", { locale: ja })}
                                            </td>
                                            <td className="text-sm">{e.user.name}</td>
                                            <td>
                                                <span className="badge bg-orange-50 text-orange-700">
                                                    {e.category}
                                                </span>
                                            </td>
                                            <td className="text-sm font-bold text-right">
                                                ¥{e.amount.toLocaleString("ja-JP")}
                                            </td>
                                            <td className="text-sm text-gray-500 max-w-40 truncate">{e.memo || "—"}</td>
                                            <td>
                                                {e.receiptImageUrl ? (
                                                    <a href={e.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                        画像
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td>
                                                {currentUser?.id === e.userId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(e.id, e.userId)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                        title="削除"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) }
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="modal p-6 w-full max-w-2xl" id="expense-modal">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-gray-900">経費登録</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Side: Receipt Upload / Preview */}
                            <div>
                                <label className="form-label">領収書画像（任意）</label>
                                {!previewUrl ? (
                                    <div
                                        className={`upload-zone h-40 ${dragOver ? "drag-over" : ""} flex flex-col items-center justify-center p-4`}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                        />
                                        <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-600">画像を選択かドロップ</p>
                                    </div>
                                ) : (
                                    <div className="relative rounded-lg overflow-hidden border border-gray-200 group h-40 bg-gray-50 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={previewUrl} alt="レシートプレビュー" className="max-h-full max-w-full object-contain" />
                                        {uploading ? (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setPreviewUrl(""); setForm(f => ({ ...f, receiptImageUrl: "" })) }}
                                                className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Form Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="form-label">日付</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        id="expense-date"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">カテゴリ</label>
                                    <select
                                        className="form-input"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        id="expense-category"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">金額（円）</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="例: 3500"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: normalizeToHalfWidthNumeric(e.target.value) })}
                                        id="expense-amount"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">メモ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="店名・用途など"
                                        value={form.memo}
                                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                        id="expense-memo"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button className="btn btn-secondary flex-1 justify-center" onClick={() => setShowModal(false)}>
                                キャンセル
                            </button>
                            <button
                                className="btn btn-primary flex-1 justify-center"
                                onClick={handleSave}
                                disabled={saving || uploading || !form.amount || !form.date}
                                id="expense-save-btn"
                            >
                                {saving ? "保存中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
