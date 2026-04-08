import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
            <div className="text-center max-w-md">
                <p className="text-6xl font-bold text-gray-200 mb-2">404</p>
                <h1 className="text-xl font-bold text-gray-900 mb-2">ページが見つかりません</h1>
                <p className="text-gray-500 text-sm mb-6">
                    お探しのページは存在しないか、移動した可能性があります。
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    ダッシュボードへ
                </Link>
            </div>
        </div>
    );
}
