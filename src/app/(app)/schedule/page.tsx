"use client";

import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, isSameDay } from "date-fns";
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

const SLOT_MINUTES = 30;
const HOUR_START = 7;
const HOUR_END = 23;
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES;

const emptyForm = (date?: string): SchedForm => ({
    title: "",
    location: "",
    date: date || format(new Date(), "yyyy-MM-dd"),
    startHour: "09:00",
    endHour: "10:00",
});

type ViewMode = "group" | "individual";

function buildTimeSlots(day: Date) {
    const slots: { label: string; date: Date; index: number }[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
        const minutes = HOUR_START * 60 + i * SLOT_MINUTES;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        const slotDate = new Date(day);
        slotDate.setHours(h, m, 0, 0);
        slots.push({
            label: format(slotDate, "HH:mm"),
            date: slotDate,
            index: i,
        });
    }
    return slots;
}

export default function SchedulePage() {
    const { currentUser } = useAuth();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("group");
    const [selectedGroupId, setSelectedGroupId] = useState<string>(""); // "" = 全員
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const [referenceDate, setReferenceDate] = useState(() => new Date());
    const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(() => {
        if (typeof window === "undefined") return 1;
        const v = localStorage.getItem("schedule_week_starts_on");
        return v === "0" ? 0 : 1;
    });
    useEffect(() => {
        localStorage.setItem("schedule_week_starts_on", String(weekStartsOn));
    }, [weekStartsOn]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<SchedForm>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

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

    const isIndividualWeekView = viewMode === "individual" && !!selectedUserId;
    const weekStartDate = useMemo(
        () => startOfWeek(referenceDate, { weekStartsOn }),
        [referenceDate, weekStartsOn]
    );
    const weekDays = useMemo(() => {
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) days.push(addDays(weekStartDate, i));
        return days;
    }, [weekStartDate]);

    const fetchSchedules = () => {
        let rangeStart: Date;
        let rangeEnd: Date;
        if (isIndividualWeekView) {
            rangeStart = startOfDay(weekStartDate);
            rangeEnd = endOfDay(addDays(weekStartDate, 6));
        } else {
            rangeStart = startOfDay(referenceDate);
            rangeEnd = endOfDay(referenceDate);
        }
        const start = format(rangeStart, "yyyy-MM-dd'T'HH:mm:ss");
        const end = format(rangeEnd, "yyyy-MM-dd'T'HH:mm:ss");
        fetch(`/api/schedules?startDate=${start}&endDate=${end}`)
            .then((r) => r.json())
            .then((data) => setSchedules(Array.isArray(data) ? data : []));
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { fetchSchedules(); }, [referenceDate, viewMode, selectedUserId, weekStartsOn]);
    useEffect(() => {
        if (viewMode !== "individual") return;
        if (selectedUserId) return;
        if (!currentUser?.id) return;
        const exists = users.some((u) => u.id === currentUser.id);
        if (exists) setSelectedUserId(currentUser.id);
    }, [viewMode, selectedUserId, currentUser?.id, users]);

    const displayUsers = useMemo(() => {
        if (viewMode === "individual" && selectedUserId) {
            const u = users.find(x => x.id === selectedUserId);
            return u ? [u] : [];
        }
        if (viewMode === "group") {
            if (!selectedGroupId) return users; // 全員
            return users.filter(u => u.groupId === selectedGroupId);
        }
        return users;
    }, [users, viewMode, selectedUserId, selectedGroupId]);

    const timeSlots = useMemo(() => buildTimeSlots(referenceDate), [referenceDate]);

    type ScheduleSlot = { schedule: Schedule; startSlotIndex: number; slotSpan: number };
    const scheduleSlotsByUser = useMemo(() => {
        const map: Record<string, ScheduleSlot[]> = {};
        displayUsers.forEach(u => { map[u.id] = []; });
        schedules.forEach(s => {
            const startDate = new Date(s.startTime);
            const endDate = new Date(s.endTime);
            const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
            const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
            const baseMinutes = HOUR_START * 60;
            let startSlotIndex = Math.floor((startMinutes - baseMinutes) / SLOT_MINUTES);
            let endSlotIndex = Math.ceil((endMinutes - baseMinutes) / SLOT_MINUTES);
            startSlotIndex = Math.max(0, Math.min(startSlotIndex, TOTAL_SLOTS - 1));
            endSlotIndex = Math.max(startSlotIndex + 1, Math.min(endSlotIndex, TOTAL_SLOTS));
            const slotSpan = Math.max(1, endSlotIndex - startSlotIndex);
            if (!map[s.userId]) map[s.userId] = [];
            map[s.userId].push({ schedule: s, startSlotIndex, slotSpan });
        });
        Object.keys(map).forEach(uid => {
            map[uid].sort((a, b) => a.startSlotIndex - b.startSlotIndex);
        });
        return map;
    }, [schedules, displayUsers]);

    const getScheduleAtSlot = (userId: string, slotIndex: number): ScheduleSlot | null => {
        const list = scheduleSlotsByUser[userId] || [];
        return list.find(s => s.startSlotIndex === slotIndex) || null;
    };

    // 個人・週間用: 日付ごとのスロット（その日の予定のみ）
    const scheduleSlotsByDay = useMemo(() => {
        if (!isIndividualWeekView || !selectedUserId) return [];
        const byDay: ScheduleSlot[][] = [[], [], [], [], [], [], []];
        schedules
            .filter(s => s.userId === selectedUserId)
            .forEach(s => {
                const startDate = new Date(s.startTime);
                const endDate = new Date(s.endTime);
                const dayIndex = weekDays.findIndex(d => isSameDay(d, startDate));
                if (dayIndex < 0) return;
                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                const baseMinutes = HOUR_START * 60;
                let startSlotIndex = Math.floor((startMinutes - baseMinutes) / SLOT_MINUTES);
                let endSlotIndex = Math.ceil((endMinutes - baseMinutes) / SLOT_MINUTES);
                startSlotIndex = Math.max(0, Math.min(startSlotIndex, TOTAL_SLOTS - 1));
                endSlotIndex = Math.max(startSlotIndex + 1, Math.min(endSlotIndex, TOTAL_SLOTS));
                const slotSpan = Math.max(1, endSlotIndex - startSlotIndex);
                byDay[dayIndex].push({ schedule: s, startSlotIndex, slotSpan });
            });
        byDay.forEach(list => list.sort((a, b) => a.startSlotIndex - b.startSlotIndex));
        return byDay;
    }, [schedules, isIndividualWeekView, selectedUserId, weekDays]);

    const getScheduleAtSlotForDay = (dayIndex: number, slotIndex: number): ScheduleSlot | null => {
        const list = scheduleSlotsByDay[dayIndex] || [];
        return list.find(s => s.startSlotIndex === slotIndex) || null;
    };

    const handleSave = async () => {
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
                    title: form.title,
                    location: form.location,
                    startTime,
                    endTime,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setShowModal(false);
                setForm(emptyForm());
                setEditId(null);
                fetchSchedules();
            } else {
                alert(data.error || "スケジュールの保存に失敗しました。");
            }
        } catch (e) {
            alert("通信エラーが発生しました。");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("このスケジュールを削除しますか？")) return;
        await fetch(`/api/schedules/${id}`, { method: "DELETE" });
        fetchSchedules();
    };

    const openAddModal = (date: Date, startHour?: string) => {
        setForm(emptyForm(format(date, "yyyy-MM-dd")));
        if (startHour) setForm(f => ({ ...f, startHour, endHour: startHour }));
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

    const ScheduleCellContent = ({ s, rowSpan }: { s: Schedule; rowSpan: number }) => (
        <div
            className={`text-xs p-2 rounded border shadow-sm cursor-pointer hover:brightness-95 transition-all h-full min-h-[3rem] flex flex-col ${USER_COLORS[userColorMap[s.userId] ?? 0]}`}
            onClick={(e) => { e.stopPropagation(); openEditModal(s); }}
            style={{ minHeight: `${rowSpan * 32 - 4}px` }}
        >
            <div className="flex justify-between items-start gap-1">
                <p className="font-bold leading-tight truncate flex-1">{s.title}</p>
                {currentUser?.id === s.userId && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="opacity-40 hover:opacity-100 hover:text-red-500 p-0.5" title="削除">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                )}
            </div>
            <p className="text-[10px] opacity-80 mt-0.5">
                {format(parseISO(s.startTime), "HH:mm")} - {format(parseISO(s.endTime), "HH:mm")}
            </p>
            {s.location && <p className="text-[10px] opacity-70 truncate mt-0.5">📍{s.location}</p>}
        </div>
    );

    return (
        <div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">スケジュール</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {isIndividualWeekView
                            ? `${format(weekDays[0], "yyyy年 M月d日", { locale: ja })} 〜 ${format(weekDays[6], "M月d日(EEE)", { locale: ja })}`
                            : format(referenceDate, "yyyy年 M月d日(EEE)", { locale: ja })}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {(["group", "individual"] as ViewMode[]).map(m => (
                            <button
                                key={m}
                                className={`min-w-[5.5rem] py-1.5 text-xs font-bold rounded-md transition-all text-center ${viewMode === m ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                onClick={() => setViewMode(m)}
                            >
                                {m === "group" ? "グループ" : "個人"}
                            </button>
                        ))}
                    </div>

                    {viewMode === "group" && (
                        <select className="form-input text-xs py-1.5" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
                            <option value="">全員</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    )}
                    {viewMode === "individual" && (
                        <>
                            <select className="form-input text-xs py-1.5" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                                <option value="">ユーザーを選択</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button
                                    type="button"
                                    className={`min-w-[5.5rem] py-1.5 text-xs font-bold rounded-md transition-all text-center ${weekStartsOn === 0 ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    onClick={() => setWeekStartsOn(0)}
                                >
                                    日曜始まり
                                </button>
                                <button
                                    type="button"
                                    className={`min-w-[5.5rem] py-1.5 text-xs font-bold rounded-md transition-all text-center ${weekStartsOn === 1 ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    onClick={() => setWeekStartsOn(1)}
                                >
                                    月曜始まり
                                </button>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-1">
                        <button
                            className="btn btn-secondary p-1.5"
                            onClick={() => setReferenceDate(isIndividualWeekView ? addDays(referenceDate, -7) : addDays(referenceDate, -1))}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setReferenceDate(new Date())}>
                            {isIndividualWeekView ? "今週" : "今日"}
                        </button>
                        <button
                            className="btn btn-secondary p-1.5"
                            onClick={() => setReferenceDate(isIndividualWeekView ? addDays(referenceDate, 7) : addDays(referenceDate, 1))}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <input
                        type="date"
                        className="form-input text-sm py-1.5"
                        value={format(referenceDate, "yyyy-MM-dd")}
                        onChange={e => setReferenceDate(new Date(e.target.value))}
                    />

                    <button className="btn btn-primary" onClick={() => openAddModal(referenceDate)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        追加
                    </button>
                </div>
            </div>

            <div className="card p-0 overflow-auto shadow-sm border-gray-200">
                {!isIndividualWeekView && displayUsers.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        {users.length === 0 && "ユーザーが登録されていません"}
                        {users.length > 0 && viewMode === "individual" && !selectedUserId && "ユーザーを選択してください"}
                        {users.length > 0 && viewMode === "group" && selectedGroupId && "このグループに所属するユーザーがいません"}
                    </div>
                ) : isIndividualWeekView ? (
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <th className="w-16 sm:w-20 py-2 px-1 text-left text-xs font-bold text-gray-500 border-r border-gray-200">時間</th>
                                {weekDays.map((d, i) => (
                                    <th key={i} className="py-2 px-1 text-center text-xs font-bold text-gray-700 border-r border-gray-200 last:border-r-0 min-w-[80px]">
                                        {format(d, "M/d(E)", { locale: ja })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const rowsRemaining: number[] = [0, 0, 0, 0, 0, 0, 0];
                                return timeSlots.map((slot) => (
                                    <tr
                                        key={slot.index}
                                        className={`border-b border-gray-100 hover:bg-gray-50/50 ${(() => {
                                            const now = new Date();
                                            const min = now.getHours() * 60 + now.getMinutes();
                                            const currentSlot = Math.floor((min - HOUR_START * 60) / SLOT_MINUTES);
                                            if (slot.index !== Math.max(0, Math.min(TOTAL_SLOTS - 1, currentSlot))) return "";
                                            const today = weekDays.findIndex(d => isSameDay(d, now));
                                            return today >= 0 ? "bg-blue-50/30" : "";
                                        })()}`}
                                    >
                                        <td className="w-16 sm:w-20 py-0.5 px-1 text-[10px] text-gray-500 border-r border-gray-100 align-top pt-1">
                                            {slot.label}
                                        </td>
                                        {weekDays.map((day, dayIndex) => {
                                            if ((rowsRemaining[dayIndex] ?? 0) > 0) {
                                                rowsRemaining[dayIndex] = rowsRemaining[dayIndex]! - 1;
                                                return null;
                                            }
                                            const slotInfo = getScheduleAtSlotForDay(dayIndex, slot.index);
                                            if (slotInfo) {
                                                rowsRemaining[dayIndex] = slotInfo.slotSpan - 1;
                                                return (
                                                    <td
                                                        key={dayIndex}
                                                        rowSpan={slotInfo.slotSpan}
                                                        className="p-1 align-top border-r border-gray-100 last:border-r-0"
                                                    >
                                                        <ScheduleCellContent s={slotInfo.schedule} rowSpan={slotInfo.slotSpan} />
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td
                                                    key={dayIndex}
                                                    className="align-top border-r border-gray-100 last:border-r-0 p-0.5 min-h-[32px]"
                                                    onClick={() => openAddModal(day, slot.label)}
                                                >
                                                    <div className="min-h-[28px] rounded hover:bg-blue-50/50 transition-colors cursor-pointer" />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                <th className="w-16 sm:w-20 py-2 px-1 text-left text-xs font-bold text-gray-500 border-r border-gray-200">時間</th>
                                {displayUsers.map(u => (
                                    <th key={u.id} className="py-2 px-1 text-center text-xs font-bold text-gray-700 border-r border-gray-200 last:border-r-0">
                                        {u.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const rowsRemaining: Record<string, number> = {};
                                return timeSlots.map((slot) => (
                                    <tr
                                        key={slot.index}
                                        className={`border-b border-gray-100 hover:bg-gray-50/50 ${(() => {
                                        if (!isSameDay(referenceDate, new Date())) return "";
                                        const now = new Date();
                                        const min = now.getHours() * 60 + now.getMinutes();
                                        const currentSlot = Math.floor((min - HOUR_START * 60) / SLOT_MINUTES);
                                        return slot.index === Math.max(0, Math.min(TOTAL_SLOTS - 1, currentSlot)) ? "bg-blue-50/30" : "";
                                    })()}`}
                                    >
                                        <td className="w-16 sm:w-20 py-0.5 px-1 text-[10px] text-gray-500 border-r border-gray-100 align-top pt-1">
                                            {slot.label}
                                        </td>
                                        {displayUsers.map((user) => {
                                            if ((rowsRemaining[user.id] ?? 0) > 0) {
                                                rowsRemaining[user.id] = rowsRemaining[user.id]! - 1;
                                                return null;
                                            }
                                            const slotInfo = getScheduleAtSlot(user.id, slot.index);
                                            if (slotInfo) {
                                                rowsRemaining[user.id] = slotInfo.slotSpan - 1;
                                                return (
                                                    <td
                                                        key={user.id}
                                                        rowSpan={slotInfo.slotSpan}
                                                        className="p-1 align-top border-r border-gray-100 last:border-r-0 w-[min(120px,20vw)]"
                                                    >
                                                        <ScheduleCellContent s={slotInfo.schedule} rowSpan={slotInfo.slotSpan} />
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td
                                                    key={user.id}
                                                    className="align-top border-r border-gray-100 last:border-r-0 p-0.5 min-h-[32px]"
                                                    onClick={() => openAddModal(referenceDate, slot.label)}
                                                >
                                                    <div className="min-h-[28px] rounded hover:bg-blue-50/50 transition-colors cursor-pointer" />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
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
