/**
 * Neon などサーバーレス向けに Postgres URL を補強する。
 * @see https://neon.tech/docs/guides/prisma — P1001 / compute 起動待ち対策に connect_timeout を推奨
 */
export function enhancePostgresUrlForServerlessRuntime(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (!trimmed.includes("neon.tech")) return trimmed;

    const additions: string[] = [];
    if (!/[?&]connect_timeout=/.test(trimmed)) additions.push("connect_timeout=15");
    if (!/[?&]pool_timeout=/.test(trimmed)) additions.push("pool_timeout=20");
    if (trimmed.includes("-pooler.") && !/[?&]pgbouncer=/.test(trimmed)) {
        additions.push("pgbouncer=true");
    }
    if (additions.length === 0) return trimmed;

    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}${additions.join("&")}`;
}
