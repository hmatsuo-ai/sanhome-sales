/**
 * スケジュール用: 画面は「端末のローカル日付・時刻」、API/DB は UTC（ISO 8601）で統一する。
 * タイムゾーン無しの "yyyy-MM-ddTHH:mm:ss" をサーバーに送ると UTC 扱いになりずれるため、
 * クライアントでローカル暦から Date を組み立てて toISOString() する。
 */

export function localYmdAndTimeToUtcIso(ymd: string, hm: string): string {
    const [y, mo, d] = ymd.split("-").map((n) => Number(n));
    const [h, mi] = hm.split(":").map((n) => Number(n));
    if (!y || !mo || !d || h !== h || mi !== mi) {
        throw new Error("Invalid date or time");
    }
    return new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
}
