"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Group {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    groupId: string | null;
}

export default function SettingsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const [newGroupName, setNewGroupName] = useState("");
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);

    // New User State
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("password123");
    const [newUserRole, setNewUserRole] = useState("sales");
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [gRes, uRes] = await Promise.all([
                fetch("/api/groups"),
                fetch("/api/users")
            ]);
            const gData = await gRes.json();
            const uData = await uRes.json();
            setGroups(Array.isArray(gData) ? gData : []);
            setUsers(Array.isArray(uData) ? uData : []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setIsCreatingGroup(true);
        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newGroupName }),
            });
            if (res.ok) {
                setNewGroupName("");
                fetchData();
            }
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm("このグループを削除しますか？（所属ユーザーは未設定になります）")) return;
        const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
        if (res.ok) fetchData();
    };

    const handleCreateUser = async () => {
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;
        setIsCreatingUser(true);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                    role: newUserRole
                }),
            });
            if (res.ok) {
                setNewUserName("");
                setNewUserEmail("");
                setNewUserPassword("password123");
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error || "ユーザーの作成に失敗しました");
            }
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) fetchData();
        } catch (error) {
            console.error("Update user error:", error);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-400">読み込み中...</div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-noto">システム設定</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. User Registration */}
                <div className="lg:col-span-1">
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">新規ユーザー登録</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">名前</label>
                                <input
                                    type="text"
                                    className="form-input text-sm"
                                    placeholder="山田 太郎"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">メールアドレス</label>
                                <input
                                    type="email"
                                    className="form-input text-sm"
                                    placeholder="example@sunhome.co.jp"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">初期パスワード</label>
                                <input
                                    type="text"
                                    className="form-input text-sm"
                                    value={newUserPassword}
                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">権限</label>
                                <select
                                    className="form-input text-sm"
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                >
                                    <option value="sales">営業担当</option>
                                    <option value="admin">管理者</option>
                                </select>
                            </div>
                            <button
                                className="btn btn-primary w-full mt-2"
                                onClick={handleCreateUser}
                                disabled={isCreatingUser || !newUserName.trim() || !newUserEmail.trim()}
                            >
                                {isCreatingUser ? "登録中..." : "ユーザーを登録"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Group Management */}
                <div className="lg:col-span-1">
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">グループ管理</h2>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="form-input text-sm"
                                placeholder="新グループ名"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                            <button
                                className="btn btn-primary whitespace-nowrap"
                                onClick={handleCreateGroup}
                                disabled={isCreatingGroup || !newGroupName.trim()}
                            >
                                追加
                            </button>
                        </div>

                        <div className="space-y-2">
                            {groups.map((g) => (
                                <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-sm font-medium text-gray-700">{g.name}</span>
                                    <button
                                        onClick={() => handleDeleteGroup(g.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. User List & Assignment */}
                <div className="lg:col-span-1">
                    <div className="card h-fit">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">ユーザー一覧・所属設定</h2>
                        <div className="space-y-4">
                            {users.map((u) => (
                                <div key={u.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-900">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${u.role === "admin" ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                                            {u.role === "admin" ? "管理者" : "営業"}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase">所属グループ</label>
                                        <select
                                            className="form-input text-xs py-1.5"
                                            value={u.groupId || ""}
                                            onChange={(e) => handleUpdateUser(u.id, { groupId: e.target.value || null })}
                                        >
                                            <option value="">（未設定）</option>
                                            {groups.map((g) => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <Link
                                            href={`/users/${u.id}`}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            個人詳細・パスワード変更
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

