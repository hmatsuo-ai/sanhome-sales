import { runMorningDigestCron } from "@/lib/morning-digest-run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
        console.error("[cron/morning-digest] CRON_SECRET が未設定です");
        return false;
    }
    const auth = request.headers.get("authorization");
    return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
    if (!authorizeCron(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const payload = await runMorningDigestCron(new Date());
        return NextResponse.json(payload);
    } catch (e) {
        console.error("[cron/morning-digest]", e);
        return NextResponse.json({ error: "Cron failed" }, { status: 500 });
    }
}
