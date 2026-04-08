import { Resend } from "resend";
import { buildMorningDigestHtml, buildMorningDigestSubject, type MorningDigestScheduleRow } from "./morning-digest-mail";

function getResend(): Resend | null {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    return new Resend(key);
}

export async function sendMorningDigestEmail(params: {
    to: string;
    userName: string;
    dateLabel: string;
    schedules: MorningDigestScheduleRow[];
    isTest: boolean;
}): Promise<{ ok: true; id?: string } | { ok: false; skipped: true; reason: string } | { ok: false; error: string }> {
    const from = process.env.EMAIL_FROM?.trim() || "Sanhome <onboarding@resend.dev>";
    const fixedFrom = from.includes("@") ? from : "Sanhome <onboarding@resend.dev>";

    const resend = getResend();
    const html = buildMorningDigestHtml({
        userName: params.userName,
        dateLabel: params.dateLabel,
        schedules: params.schedules,
        isTest: params.isTest,
    });
    const subject = buildMorningDigestSubject(params.dateLabel, params.isTest);

    if (!resend) {
        console.warn("[morning-digest] RESEND_API_KEY 未設定のため送信スキップ:", params.to);
        return { ok: false, skipped: true, reason: "RESEND_API_KEY missing" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: fixedFrom.includes("<") ? fixedFrom : `Sanhome <${fixedFrom}>`,
            to: params.to,
            subject,
            html,
        });
        if (error) {
            console.error("[morning-digest] Resend error:", error);
            return { ok: false, error: error.message };
        }
        return { ok: true, id: data?.id };
    } catch (e) {
        const msg = e instanceof Error ? e.message : "send failed";
        console.error("[morning-digest]", e);
        return { ok: false, error: msg };
    }
}
