import { getPrisma, prisma } from "@/lib/prisma";
import { formatTokyoDateLabel, getTokyoDayUtcRange } from "@/lib/jst-range";
import type { MorningDigestScheduleRow } from "@/lib/morning-digest-mail";
import { sendMorningDigestEmail } from "@/lib/send-morning-email";

const schedulesPrisma = getPrisma("schedules");

export async function loadSchedulesForTokyoDay(
    userId: string,
    nowUtc: Date
): Promise<MorningDigestScheduleRow[]> {
    const { start, end } = getTokyoDayUtcRange(nowUtc);
    const rows = await schedulesPrisma.schedule.findMany({
        where: {
            userId,
            startTime: { lt: end },
            endTime: { gt: start },
        },
        orderBy: { startTime: "asc" },
        select: { title: true, startTime: true, endTime: true, location: true },
    });
    return rows.map((r) => ({
        title: r.title,
        startTime: r.startTime,
        endTime: r.endTime,
        location: r.location ?? "",
    }));
}

export async function runMorningDigestCron(nowUtc: Date = new Date()): Promise<{
    ok: true;
    tokyoDateLabel: string;
    results: { userId: string; email: string; outcome: string }[];
}> {
    const users = await prisma.user.findMany({
        where: { isActive: true, notifyMorningDigest: true },
        select: { id: true, name: true, email: true },
    });
    const dateLabel = formatTokyoDateLabel(nowUtc);
    const results: { userId: string; email: string; outcome: string }[] = [];

    for (const u of users) {
        const schedules = await loadSchedulesForTokyoDay(u.id, nowUtc);
        const sent = await sendMorningDigestEmail({
            to: u.email,
            userName: u.name,
            dateLabel,
            schedules,
            isTest: false,
        });
        if (sent.ok) {
            results.push({ userId: u.id, email: u.email, outcome: sent.id ? `sent:${sent.id}` : "sent" });
        } else if ("skipped" in sent && sent.skipped) {
            results.push({ userId: u.id, email: u.email, outcome: `skipped:${sent.reason}` });
        } else {
            const errMsg = "error" in sent ? sent.error : "unknown";
            results.push({ userId: u.id, email: u.email, outcome: `error:${errMsg}` });
        }
    }

    return { ok: true, tokyoDateLabel: dateLabel, results };
}

export async function sendMorningDigestTest(params: {
    userId: string;
    nowUtc?: Date;
}): Promise<
    | { ok: true; tokyoDateLabel: string; messageId?: string }
    | { ok: false; error: string }
    | { ok: false; skipped: true; reason: string }
> {
    const nowUtc = params.nowUtc ?? new Date();
    const user = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true, name: true, email: true, isActive: true },
    });
    if (!user) return { ok: false, error: "ユーザーが見つかりません" };
    if (!user.isActive) return { ok: false, error: "このユーザーは無効化されています" };

    const dateLabel = formatTokyoDateLabel(nowUtc);
    const schedules = await loadSchedulesForTokyoDay(user.id, nowUtc);
    const sent = await sendMorningDigestEmail({
        to: user.email,
        userName: user.name,
        dateLabel,
        schedules,
        isTest: true,
    });

    if (sent.ok) return { ok: true, tokyoDateLabel: dateLabel, messageId: sent.id };
    if ("skipped" in sent && sent.skipped) return { ok: false, skipped: true, reason: sent.reason };
    return { ok: false, error: "error" in sent ? sent.error : "送信に失敗しました" };
}
