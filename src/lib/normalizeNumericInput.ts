/**
 * 数値入力用: 全角数字・記号を半角に変換する
 * ０-９ → 0-9, ．→ ., －→ -
 */
export function normalizeToHalfWidthNumeric(value: string): string {
    if (value == null || value === "") return value;
    return value
        .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
        .replace(/．/g, ".")
        .replace(/－/g, "-");
}
