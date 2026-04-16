/** 契約集計など、日本（東京）の暦・月境界に合わせるためのユーティリティ */

export function tokyoYearMonthKey(d: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value ?? "1970";
    const month = parts.find((p) => p.type === "month")?.value ?? "01";
    return `${year}-${month}`;
}

/** 東京の「今」の年・月（1–12） */
export function getTokyoYearMonth(now = new Date()): { year: number; month: number; ymKey: string } {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "numeric",
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
    const month = Number(parts.find((p) => p.type === "month")?.value ?? "1");
    return { year, month, ymKey: `${year}-${String(month).padStart(2, "0")}` };
}

/** 東京タイムゾーンでその月の [start, end]（DB の date 比較用・両端含む日） */
export function tokyoMonthRangeUtc(year: number, month: number): { start: Date; end: Date } {
    const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+09:00`);
    const nextY = month === 12 ? year + 1 : year;
    const nextM = month === 12 ? 1 : month + 1;
    const nextStart = new Date(`${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00+09:00`);
    const end = new Date(nextStart.getTime() - 1);
    return { start, end };
}

/**
 * 売上半期（4–9月 / 10–翌3月）における各月 { year, month }
 * 売上管理画面の半期ロジックと同一
 */
export function getFiscalHalfYearMonthsTokyo(now = new Date()): { year: number; month: number }[] {
    const { year, month } = getTokyoYearMonth(now);
    if (month >= 4 && month <= 9) {
        return [4, 5, 6, 7, 8, 9].map((m) => ({ year, month: m }));
    }
    if (month >= 10) {
        return [
            ...[10, 11, 12].map((m) => ({ year, month: m })),
            ...[1, 2, 3].map((m) => ({ year: year + 1, month: m })),
        ];
    }
    return [
        ...[10, 11, 12].map((m) => ({ year: year - 1, month: m })),
        ...[1, 2, 3].map((m) => ({ year, month: m })),
    ];
}

export function formatYearMonthJa(year: number, month: number): string {
    return `${year}年${month}月`;
}

/**
 * 東京の「当月」を含む、直近6か月（暦月・連続）。
 * 配列は古い月 → 新しい月の順（先頭が6か月前、末尾が当月）。
 */
export function getRollingSixMonthsTokyo(now = new Date()): { year: number; month: number }[] {
    let { year, month } = getTokyoYearMonth(now);
    const newestFirst: { year: number; month: number }[] = [];
    for (let i = 0; i < 6; i++) {
        newestFirst.push({ year, month });
        month -= 1;
        if (month < 1) {
            month = 12;
            year -= 1;
        }
    }
    return newestFirst.reverse();
}
