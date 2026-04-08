/**
 * AuthContext の currentUser.id が未確定のとき、サーバー側セッションで user id を取得する。
 */
export async function resolveUserId(existingId: string | undefined | null): Promise<string | null> {
    if (existingId) return existingId;
    try {
        const r = await fetch("/api/me", { credentials: "same-origin" });
        if (!r.ok) return null;
        const data = (await r.json()) as { id?: string };
        return data?.id ?? null;
    } catch {
        return null;
    }
}
