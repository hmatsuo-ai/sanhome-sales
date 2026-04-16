"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/** ok_restricted: 403 だが API 到達（管理者専用本文など） */
type CheckStatus = "pending" | "ok" | "ok_restricted" | "warn" | "fail";

interface ApiCheckRow {
    id: string;
    label: string;
    path: string;
    /** 200 以外でも API 到達としてよい HTTP ステータス（例: 管理者専用の 403） */
    acceptAlso?: number[];
}

const API_CHECKS: ApiCheckRow[] = [
    {
        id: "session",
        label: "認証セッション",
        path: "/api/auth/session",
    },
    {
        id: "me",
        label: "ログイン中ユーザー（/api/me）",
        path: "/api/me",
    },
    {
        id: "users",
        label: "ユーザー一式",
        path: "/api/users",
    },
    {
        id: "groups",
        label: "グループ一式",
        path: "/api/groups",
    },
    {
        id: "sales",
        label: "売上一覧",
        path: "/api/sales?startDate=2000-01-01&endDate=2100-12-31",
    },
    {
        id: "expenses",
        label: "経費一覧",
        path: "/api/expenses?startDate=2000-01-01&endDate=2100-12-31",
    },
    {
        id: "schedules",
        label: "スケジュール一覧",
        path: "/api/schedules?startDate=2000-01-01&endDate=2100-12-31",
    },
    {
        id: "database-modules",
        label: "DB 接続状況（管理者向け）",
        path: "/api/system/database-modules",
        acceptAlso: [403],
    },
];

interface ResultRow extends ApiCheckRow {
    status: CheckStatus;
    httpStatus?: number;
    ms?: number;
    detail?: string;
}

function pendingRows(): ResultRow[] {
    return API_CHECKS.map((c) => ({ ...c, status: "pending" as const }));
}

function statusLabel(status: CheckStatus): string {
    switch (status) {
        case "pending":
            return "待機";
        case "ok":
            return "OK";
        case "ok_restricted":
            return "OK（権限）";
        case "warn":
            return "要確認";
        case "fail":
            return "失敗";
        default:
            return "—";
    }
}

function statusClass(status: CheckStatus): string {
    switch (status) {
        case "ok":
            return "text-green-700 bg-green-50";
        case "ok_restricted":
            return "text-sky-800 bg-sky-50";
        case "warn":
            return "text-amber-800 bg-amber-50";
        case "fail":
            return "text-red-700 bg-red-50";
        default:
            return "text-gray-500 bg-gray-50";
    }
}

export default function DiagnosticsPage() {
    const [results, setResults] = useState<ResultRow[] | null>(null);
    const [running, setRunning] = useState(false);
    const [ranAt, setRanAt] = useState<Date | null>(null);

    const runChecks = useCallback(async () => {
        setRunning(true);
        setRanAt(null);
        setResults(pendingRows());

        const next = await Promise.all(
            API_CHECKS.map(async (check): Promise<ResultRow> => {
                const started = performance.now();
                try {
                    const res = await fetch(check.path, {
                        method: "GET",
                        credentials: "same-origin",
                        cache: "no-store",
                    });
                    const ms = Math.round(performance.now() - started);
                    const ok =
                        res.ok ||
                        (check.acceptAlso?.includes(res.status) ?? false);
                    let detail: string | undefined;
                    if (res.status === 403 && check.acceptAlso?.includes(403)) {
                        detail =
                            "営業アカウントでは想定どおりです。DB モジュール一覧は管理者でログインすると取得できます。";
                    } else if (!res.ok && !check.acceptAlso?.includes(res.status)) {
                        try {
                            const j = await res.json().catch(() => null);
                            detail =
                                j && typeof j === "object" && "error" in j && typeof (j as { error: unknown }).error === "string"
                                    ? (j as { error: string }).error
                                    : `HTTP ${res.status}`;
                        } catch {
                            detail = `HTTP ${res.status}`;
                        }
                    }
                    let status: CheckStatus;
                    if (!ok) status = "fail";
                    else if (res.ok) status = "ok";
                    else if (res.status === 403 && (check.acceptAlso?.includes(403) ?? false)) status = "ok_restricted";
                    else status = "warn";
                    return {
                        ...check,
                        status,
                        httpStatus: res.status,
                        ms,
                        detail,
                    };
                } catch (e) {
                    const ms = Math.round(performance.now() - started);
                    return {
                        ...check,
                        status: "fail",
                        ms,
                        detail: e instanceof Error ? e.message : "ネットワークエラー",
                    };
                }
            })
        );

        setResults(next);
        setRanAt(new Date());
        setRunning(false);
    }, []);

    useEffect(() => {
        void runChecks();
    }, [runChecks]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API 連携確認</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        ブラウザから各 API に GET し、応答があるかを表示します（データは変更しません）。
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void runChecks()}
                        disabled={running}
                    >
                        {running ? "確認中..." : "再実行"}
                    </button>
                    <Link href="/settings" className="btn btn-secondary">
                        設定へ
                    </Link>
                </div>
            </div>

            <div className="card overflow-hidden">
                <p className="text-xs text-gray-500 mb-4">
                    「OK」「OK（権限）」まで揃えば連携は問題ありません。後者は管理者専用 API などで営業アカウントが 403 になる正常な状態です。DB 未接続のときは 500 や Prisma のエラー文言がメモに出ます。
                </p>
                {ranAt && (
                    <p className="text-xs text-gray-400 mb-3">最終実行: {ranAt.toLocaleString("ja-JP")}</p>
                )}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="data-table min-w-full">
                        <thead>
                            <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase">
                                <th className="px-3 py-2">機能</th>
                                <th className="px-3 py-2">パス</th>
                                <th className="px-3 py-2">結果</th>
                                <th className="px-3 py-2">HTTP</th>
                                <th className="px-3 py-2">時間</th>
                                <th className="px-3 py-2">メモ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(results ?? pendingRows()).map((row) => (
                                <tr key={row.id} className="border-t border-gray-100">
                                    <td className="px-3 py-2 font-medium text-gray-800">{row.label}</td>
                                    <td className="px-3 py-2">
                                        <code className="text-xs bg-gray-100 px-1 rounded break-all">{row.path}</code>
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${statusClass(row.status)}`}>
                                            {statusLabel(row.status)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 tabular-nums">
                                        {row.httpStatus ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 tabular-nums">
                                        {row.ms != null ? `${row.ms} ms` : "—"}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500 max-w-xs">{row.detail ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
