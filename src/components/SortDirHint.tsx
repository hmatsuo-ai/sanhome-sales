/** Compact sort-state hint for table column headers (昇順 / 降順). */
export function SortDirHint({ active, descending }: { active: boolean; descending: boolean }) {
    if (!active) {
        return (
            <span
                className="inline-flex shrink-0 items-center rounded-md border border-dashed border-gray-300 bg-gray-50/80 px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-500 whitespace-nowrap dark:border-gray-600 dark:bg-[var(--color-surface-elevated)] dark:text-[var(--color-text-muted)]"
                title="クリックで並べ替え"
            >
                並べ替え
            </span>
        );
    }
    if (descending) {
        return (
            <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-rose-800 whitespace-nowrap dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-100"
                title="降順（大きい値・新しい日付が先）"
            >
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                降順
            </span>
        );
    }
    return (
        <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-800 whitespace-nowrap dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100"
            title="昇順（小さい値・古い日付が先）"
        >
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            昇順
        </span>
    );
}
