"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";
import { SalesPeriodReportPanel } from "@/components/sales/SalesPeriodReportPanel";

export default function SalesReportPage() {
    const [startDate, setStartDate] = useState(() => format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

    return (
        <div>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/sales"
                                className="btn btn-secondary text-sm font-semibold"
                                aria-label="売上管理画面に戻る"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                売上管理へ戻る
                            </Link>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">期間別集計</h1>
                        <p className="text-gray-400 text-sm mt-1">指定した期間の売上・粗利・件数を、個人別またはグループ別に並べ替えて表示します。</p>
                    </div>
                </div>
            </div>

            <SalesPeriodReportPanel
                startDate={startDate}
                endDate={endDate}
                embedded={false}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
            />
        </div>
    );
}
