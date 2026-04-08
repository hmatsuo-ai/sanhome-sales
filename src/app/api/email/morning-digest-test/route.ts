import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendMorningDigestTest } from "@/lib/morning-digest-run";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 管理者向け: 名前「松尾 春希」と完全一致するユーザーを返す（スペースは正規化） */
async function findMatsuoUserId(): Promise<string | null> {
    const candidates = await prisma.user.findMany({
        where: {
            OR: [{ name: "松尾 春希" }, { name: "松尾春希" }],
        },
        select: { id: true },
        take: 1,
    });
    return candidates[0]?.id ?? null;
}

export async function POST(request: Request) {
    const session = await auth();
    const currentUserId = (session?.user as { id?: string } | undefined)?.id;
    if (!currentUserId) {
        return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
    }

    const current = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { role: true },
    });
    const isAdmin = current?.role === "admin";

    let body: { targetUserId?: string; sendToMatsuo?: boolean } = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    let targetUserId = typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";

    if (body.sendToMatsuo === true) {
        if (!isAdmin) {
            return NextResponse.json({ error: "権限がありません" }, { status: 403 });
        }
        const matsuoId = await findMatsuoUserId();
        if (!matsuoId) {
            return NextResponse.json(
                { error: "ユーザー「松尾 春希」が見つかりません。シードを実行するか、ユーザーを登録してください。" },
                { status: 404 }
            );
        }
        targetUserId = matsuoId;
    }

    if (!targetUserId) {
        targetUserId = currentUserId;
    } else if (targetUserId !== currentUserId && !isAdmin) {
        return NextResponse.json({ error: "他ユーザへのテスト送信は管理者のみ可能です" }, { status: 403 });
    }

    const result = await sendMorningDigestTest({ userId: targetUserId });
    if (result.ok) {
        return NextResponse.json({
            ok: true,
            tokyoDateLabel: result.tokyoDateLabel,
            messageId: result.messageId,
        });
    }
    if ("skipped" in result && result.skipped) {
        return NextResponse.json(
            { ok: false, skipped: true, reason: result.reason },
            { status: 503 }
        );
    }
    const err = "error" in result ? result.error : "送信に失敗しました";
    return NextResponse.json({ ok: false, error: err }, { status: 500 });
}
