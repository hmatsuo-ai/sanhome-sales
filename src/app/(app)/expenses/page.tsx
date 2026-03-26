"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
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
    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [dragOver, setDragOver] = useState(false);

    const fetchExpenses = () => {
        setLoading(true);
        fetch(`/api/expenses?month=${month}`)
            .then((r) => r.json())
            .then((data) => setExpenses(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchExpenses(); }, [month]); // eslint-disable-line

    const total = expenses.reduce((s, e) => s + e.amount, 0);

    // Calculate user summaries for the current month
    const [selectedSummaryUserId, setSelectedSummaryUserId] = useState<string>("");

    useEffect(() => {
        if (currentUser && !selectedSummaryUserId) {
            setSelectedSummaryUserId(currentUser.id);
        }
    }, [currentUser, selectedSummaryUserId]);

    const userSummariesRecord = expenses.reduce((acc, expense) => {
        const userId = expense.userId;
        const userName = expense.user.name;
        if (!acc[userId]) {
            acc[userId] = { id: userId, name: userName, total: 0, count: 0 };
        }
        acc[userId].total += expense.amount;
        acc[userId].count += 1;
        return acc;
    }, {} as Record<string, { id: string; name: string; total: number; count: number }>);

    const userSummaries = Object.values(userSummariesRecord).sort((a, b) => b.total - a.total);
    const selectedSummary = selectedSummaryUserId ? userSummariesRecord[selectedSummaryUserId] : null;

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
        if (!currentUser) return;
        setSaving(true);
        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.id,
                    date: form.date,
                    category: form.category,
                    amount: Number(form.amount),
                    memo: form.memo,
                    receiptImageUrl: form.receiptImageUrl || null,
                }),
            });
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm());
                setPreviewUrl("");
                fetchExpenses();
            }
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
                    <h1 className="text-2xl font-bold text-gray-900">経費精算</h1>
                    <p className="text-gray-400 text-sm mt-1">領収書の登録と管理</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        className="form-input text-sm"
                        style={{ width: "auto" }}
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
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

            {/* Summary Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Total Summary */}
                <div className="card flex flex-col justify-center">
                    <p className="text-sm text-gray-400 font-medium">月間合計経費</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">¥{total.toLocaleString("ja-JP")}</p>
                    <p className="text-sm text-gray-400 mt-2">合計: {expenses.length}件</p>
                </div>

                {/* User Summaries */}
                <div className="card md:col-span-2 p-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-gray-700">個人別 月間経費</h2>
                            {selectedSummaryUserId && (
                                <Link href={`/users/${selectedSummaryUserId}`} className="text-[10px] text-blue-600 hover:underline">詳細を表示</Link>
                            )}
                        </div>
                        <select
                            className="form-input text-xs py-1 px-2 pr-8 h-auto w-auto"
                            value={selectedSummaryUserId}
                            onChange={(e) => setSelectedSummaryUserId(e.target.value)}
                        >
                            {userSummaries.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                            {currentUser && !userSummariesRecord[currentUser.id] && (
                                <option value={currentUser.id}>{currentUser.name}</option>
                            )}
                        </select>
                    </div>

                    {!selectedSummary ? (
                        <div className="py-4 text-center">
                            <p className="text-sm text-gray-400">今月のデータはありません</p>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-5 border border-gray-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shadow-inner">
                                    {selectedSummary.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-base font-bold text-gray-800">{selectedSummary.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedSummary.count}件の経費</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 mb-0.5 font-medium">合計金額</p>
                                <p className="text-2xl font-bold text-gray-900 tracking-tight">¥{selectedSummary.total.toLocaleString("ja-JP")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Table */}
            <div className="card p-0 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-3" />
                        読み込み中...
                    </div>
                ) : expenses.filter(e => !selectedSummaryUserId || e.userId === selectedSummaryUserId).length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>表示対象の経費データがありません</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>日付</th>
                                    <th>担当者</th>
                                    <th>カテゴリ</th>
                                    <th>金額</th>
                                    <th>メモ</th>
                                    <th>領収書</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses
                                    .filter(e => !selectedSummaryUserId || e.userId === selectedSummaryUserId)
                                    .map((e) => (
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
                                                        onClick={() => handleDelete(e.id, e.userId)}
                                                        className="btn btn-danger text-xs px-2 py-1"
                                                    >
                                                        削除
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
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
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
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
