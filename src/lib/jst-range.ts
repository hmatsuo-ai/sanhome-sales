/**
 * Asia/Tokyo の「その日」の開始・終了を UTC の Date で返す（スケジュール DB の DateTime 照合用）
 */
export function getTokyoDayUtcRange(baseUtc: Date): { start: Date; end: Date } {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const ymd = fmt.format(baseUtc);
    const start = new Date(`${ymd}T00:00:00+09:00`);
    const end = new Date(`${ymd}T23:59:59.999+09:00`);
    return { start, end };
}

export function formatTokyoDateLabel(baseUtc: Date): string {
    return baseUtc.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
    });
}
