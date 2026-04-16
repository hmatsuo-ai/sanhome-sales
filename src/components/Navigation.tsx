"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/actions";

const navItems = [
    {
        href: "/dashboard",
        label: "ダッシュボード",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        href: "/expenses",
        label: "経費精算",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
        ),
    },
    {
        href: "/sales",
        label: "売上管理",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
    },
    {
        href: "/schedule",
        label: "スケジュール",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        href: "/settings",
        label: "設定",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
];

export default function Navigation({ user }: { user?: { name?: string | null; role?: string | null } | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-blue-900 text-white shadow-lg">
                <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </button>
                <span className="font-bold text-sm">サンホーム 営業管理</span>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                    {user?.name?.[0] || "?"}
                </div>
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
                {/* Logo */}
                <div className="px-6 py-5 border-b border-blue-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm leading-tight">サンホーム</p>
                            <p className="text-blue-200 text-xs">営業管理システム</p>
                        </div>
                    </div>
                </div>

                {/* User info */}
                {user && (
                    <div className="mx-4 my-3 p-3 rounded-xl bg-white/10">
                        <p className="text-blue-100 text-xs">ログイン中</p>
                        <p className="text-white font-bold text-sm truncate">{user.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === "admin" ? "bg-amber-500/20 text-amber-200" : "bg-green-500/20 text-green-200"}`}>
                            {user.role === "admin" ? "管理者" : "営業"}
                        </span>
                    </div>
                )}

                {/* Nav */}
                <nav className="flex-1 px-3 py-2 space-y-1">
                    {navItems.map((item) => {
                        const active = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active
                                    ? "bg-white text-blue-800 shadow-sm"
                                    : "text-blue-100 hover:bg-white/10"
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* API確認・修正依頼・ログアウト */}
                <div className="p-4 border-t border-blue-700/50 space-y-1">
                    <Link
                        href="/diagnostics"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${pathname === "/diagnostics" ? "bg-white text-blue-800 shadow-sm" : "text-blue-200 hover:bg-white/10"}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        API連携確認
                    </Link>
                    <Link
                        href="/feedback"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full ${pathname === "/feedback" ? "bg-white text-blue-800 shadow-sm" : "text-blue-200 hover:bg-white/10"}`}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        修正依頼
                    </Link>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-blue-200 hover:bg-white/10 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            ログアウト
                        </button>
                    </form>
                </div>
            </aside>

            {/* Bottom nav (mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-gray-200 shadow-lg pb-[env(safe-area-inset-bottom,0px)]">
                {navItems.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href + "/"));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${active ? "text-blue-700" : "text-gray-400"
                                }`}
                        >
                            <span className={`mb-0.5 ${active ? "text-blue-700" : "text-gray-400"}`}>
                                {item.icon}
                            </span>
                            {item.label.length > 4 ? item.label.slice(0, 4) : item.label}
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}

