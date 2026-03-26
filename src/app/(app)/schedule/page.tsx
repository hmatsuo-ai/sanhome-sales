"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";

interface User {
    id: string;
    name: string;
    groupId: string | null;
}

interface Group {
    id: string;
    name: string;
}

interface Schedule {
    id: string;
    userId: string;
    startTime: string;
    endTime: string;
    title: string;
    location: string;
    user: { id: string; name: string };
}

interface SchedForm {
    title: string;
    location: string;
    date: string;
    startHour: string;
    endHour: string;
}

const USER_COLORS = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-pink-100 text-pink-800 border-pink-300",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-teal-100 text-teal-800 border-teal-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-orange-100 text-orange-800 border-orange-200",
];

const emptyForm = (date?: string): SchedForm => ({
    title: "",
    location: "",
    date: date || format(new Date(), "yyyy-MM-dd"),
    startHour: "09:00",
    endHour: "10:00",
});

type ViewMode = "all" | "group" | "individual";

export default function SchedulePage() {
    const { currentUser } = useAuth();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [selectedGroupId, setSelectedGroupId] = useState<string>("");
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const [referenceDate, setReferenceDate] = useState(() => new Date());
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<SchedForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    // Color index per user for consistent appearance
    const userColorMap = useMemo(() => {
        const map: Record<string, number> = {};
        users.forEach((u, i) => { map[u.id] = i % USER_COLORS.length; });
        return map;
    }, [users]);

    const fetchInitialData = async () => {
        const [uRes, gRes] = await Promise.all([
            fetch("/api/users"),
            fetch("/api/groups")
        ]);
        const uData = await uRes.json();
        const gData = await gRes.json();
        setUsers(Array.isArray(uData) ? uData : []);
        setGroups(Array.isArray(gData) ? gData : []);
    };

    const fetchSchedules = () => {
        let start, end;
        if (viewMode === "group") {
            // Daily view for groups
            start = format(startOfDay(referenceDate), "yyyy-MM-dd'T'HH:mm:ss");
            end = format(endOfDay(referenceDate), "yyyy-MM-dd'T'HH:mm:ss");
        } else {
            // Weekly view for All/Individual
            const ws = startOfWeek(referenceDate, { weekStartsOn: 1 });
            const we = addDays(ws, 6);
            start = format(startOfDay(ws), "yyyy-MM-dd'T'HH:mm:ss");
            end = format(endOfDay(we), "yyyy-MM-dd'T'HH:mm:ss");
        }

        fetch(`/api/schedules?startDate=${start}&endDate=${end}`)
            .then((r) => r.json())
            .then((data) => setSchedules(Array.isArray(data) ? data : []));
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { fetchSchedules(); }, [referenceDate, viewMode]);

    // Derived states
    const filteredSchedules = useMemo(() => {
        if (viewMode === "all") return schedules;
        if (viewMode === "individual" && selectedUserId) {
            return schedules.filter(s => s.userId === selectedUserId);
        }
        if (viewMode === "group" && selectedGroupId) {
            const memberIds = users.filter(u => u.groupId === selectedGroupId).map(u => u.id);
            return schedules.filter(s => memberIds.includes(s.userId));
        }
        return schedules;
    }, [schedules, viewMode, selectedUserId, selectedGroupId, users]);

    const days = useMemo(() => {
        if (viewMode === "group") return [referenceDate];
        const ws = startOfWeek(referenceDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    }, [referenceDate, viewMode]);

    // Action Handlers
    const handleSave = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            const startTime = `${form.date}T${form.startHour}:00`;
            const endTime = `${form.date}T${form.endHour}:00`;
            const method = editId ? "PUT" : "POST";
            const url = editId ? `/api/schedules/${editId}` : "/api/schedules";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: currentUser.id,
                    title: form.title,
                    location: form.location,
                    startTime,
                    endTime,
                }),
            });
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm());
                setEditId(null);
                fetchSchedules();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("このスケジュールを削除しますか？")) return;
        await fetch(`/api/schedules/${id}`, { method: "DELETE" });
        fetchSchedules();
    };

    const openAddModal = (date: Date) => {
        setForm(emptyForm(format(date, "yyyy-MM-dd")));
        setEditId(null);
        setShowModal(true);
    };

    const openEditModal = (s: Schedule) => {
        setForm({
            title: s.title,
            location: s.location,
            date: format(parseISO(s.startTime), "yyyy-MM-dd"),
            startHour: format(parseISO(s.startTime), "HH:mm"),
            endHour: format(parseISO(s.endTime), "HH:mm"),
        });
        setEditId(s.id);
        setShowModal(true);
    };

    // Render Components
    const ScheduleItem = ({ s }: { s: Schedule }) => (
        <div
            className={`text-xs p-1.5 rounded border shadow-sm mb-1.5 cursor-pointer hover:brightness-95 transition-all ${USER_COLORS[userColorMap[s.userId] ?? 0]}`}
            onClick={(e) => { e.stopPropagation(); openEditModal(s); }}
        >
            <div className="flex justify-between items-start gap-1">
                <p className="font-bold leading-tight truncate flex-1">{s.title}</p>
                {currentUser?.id === s.userId && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="opacity-40 hover:opacity-100">✕</button>
                )}
            </div>
            <p className="text-[10px] opacity-80 mt-0.5">
                {format(parseISO(s.startTime), "HH:mm")} - {format(parseISO(s.endTime), "HH:mm")}
            </p>
            {viewMode !== "individual" && <p className="text-[10px] font-medium mt-0.5 border-t border-black/5 pt-0.5">{s.user.name}</p>}
            {s.location && <p className="text-[10px] opacity-70 truncate mt-0.5">📍{s.location}</p>}
        </div>
    );

    return (
        <div>
            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">スケジュール</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {viewMode === "group"
                            ? format(referenceDate, "yyyy年 M月d日(EEE)", { locale: ja })
                            : `${format(days[0], "M/d")} 〜 ${format(days[6], "M/d(EEE)", { locale: ja })}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Selectors */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(["all", "group", "individual"] as ViewMode[]).map(m => (
                            <button
                                key={m}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === m ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                onClick={() => setViewMode(m)}
                            >
                                {m === "all" ? "全員" : m === "group" ? "グループ" : "個人"}
                            </button>
                        ))}
                    </div>

                    {/* Sub Filters */}
                    {viewMode === "group" && (
                        <select className="form-input text-xs py-1.5" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                            <option value="">グループを選択</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    )}
                    {viewMode === "individual" && (
                        <select className="form-input text-xs py-1.5" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                            <option value="">ユーザーを選択</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    )}

                    <div className="flex items-center gap-1">
                        <button className="btn btn-secondary p-1.5" onClick={() => setReferenceDate(viewMode === "group" ? addDays(referenceDate, -1) : subWeeks(referenceDate, 1))}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setReferenceDate(new Date())}>今日</button>
                        <button className="btn btn-secondary p-1.5" onClick={() => setReferenceDate(viewMode === "group" ? addDays(referenceDate, 1) : addWeeks(referenceDate, 1))}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <button className="btn btn-primary" onClick={() => openAddModal(referenceDate)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        追加
                    </button>
                </div>
            </div>

            {/* Calendar View Area */}
            <div className="card p-0 overflow-hidden shadow-sm border-gray-200">
                {viewMode === "group" && selectedGroupId ? (
                    /* Group View: Member Columns */
                    <div className="flex flex-col">
                        <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${users.filter(u => u.groupId === selectedGroupId).length || 1}, 1fr)` }}>
                            {users.filter(u => u.groupId === selectedGroupId).map(u => (
                                <div key={u.id} className="p-3 text-center border-r font-bold text-sm bg-gray-50/50">
                                    {u.name}
                                </div>
                            ))}
                        </div>
                        <div className="grid min-h-[500px]" style={{ gridTemplateColumns: `repeat(${users.filter(u => u.groupId === selectedGroupId).length || 1}, 1fr)` }}>
                            {users.filter(u => u.groupId === selectedGroupId).map(u => (
                                <div
                                    key={u.id}
                                    className="p-2 border-r last:border-r-0 hover:bg-gray-50/30 transition-colors"
                                    onClick={() => openAddModal(referenceDate)}
                                >
                                    {filteredSchedules.filter(s => s.userId === u.id).map(s => <ScheduleItem key={s.id} s={s} />)}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Weekly View (All or Individual) */
                    <div className="flex flex-col">
                        <div className="grid grid-cols-7 border-b bg-gray-50/50">
                            {days.map(d => (
                                <div key={d.toISOString()} className={`p-3 text-center border-r last:border-r-0 ${isSameDay(d, new Date()) ? "bg-blue-50/80" : ""}`}>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{format(d, "EEE", { locale: ja })}</p>
                                    <p className={`text-lg font-black ${isSameDay(d, new Date()) ? "text-blue-600" : "text-gray-700"}`}>{format(d, "d")}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 min-h-[500px]">
                            {days.map(d => (
                                <div
                                    key={d.toISOString()}
                                    className={`p-2 border-r last:border-r-0 min-h-[120px] hover:bg-gray-50/30 transition-colors ${isSameDay(d, new Date()) ? "bg-blue-50/20" : ""}`}
                                    onClick={() => openAddModal(d)}
                                >
                                    {filteredSchedules.filter(s => isSameDay(parseISO(s.startTime), d)).map(s => <ScheduleItem key={s.id} s={s} />)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === "group" && !selectedGroupId && (
                    <div className="py-20 text-center text-gray-400">グループを選択してください</div>
                )}
                {viewMode === "individual" && !selectedUserId && (
                    <div className="py-20 text-center text-gray-400">ユーザーを選択してください</div>
                )}
            </div>

            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">{editId ? "予定を編集" : "新しい予定"}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400">✕</button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="form-label text-xs font-bold text-gray-500 mb-1">タイトル</label>
                                <input type="text" className="form-input py-2.5" placeholder="要件を入力" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="form-label text-xs font-bold text-gray-500 mb-1">日付</label>
                                    <input type="date" className="form-input py-2.5" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label text-xs font-bold text-gray-500 mb-1">開始</label>
                                    <input type="time" className="form-input py-2.5" value={form.startHour} onChange={e => setForm({ ...form, startHour: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label text-xs font-bold text-gray-500 mb-1">終了</label>
                                    <input type="time" className="form-input py-2.5" value={form.endHour} onChange={e => setForm({ ...form, endHour: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label text-xs font-bold text-gray-500 mb-1">場所</label>
                                <input type="text" className="form-input py-2.5" placeholder="オフィス、現場名など" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8 pt-6 border-t font-bold">
                            <button className="btn btn-secondary flex-1 justify-center py-3" onClick={() => setShowModal(false)}>キャンセル</button>
                            <button className="btn btn-primary flex-1 justify-center py-3 shadow-lg shadow-blue-100" onClick={handleSave} disabled={saving || !form.title}>
                                {saving ? "処理中..." : "保存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
