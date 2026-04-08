import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const prisma = getPrisma("dashboard");

export async function POST(request: Request) {
    try {
        const session = await auth();
        const user = session?.user as { id?: string } | undefined;
        if (!user?.id) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }
        const body = await request.json();
        const text = typeof body.body === "string" ? body.body.trim() : "";
        if (!text) {
            return NextResponse.json({ error: "内容を入力してください" }, { status: 400 });
        }
        const feedbackDelegate = (prisma as unknown as { feedback?: { create: (args: { data: { userId: string; body: string } }) => Promise<unknown> } }).feedback;
        if (feedbackDelegate?.create) {
            await feedbackDelegate.create({
                data: { userId: user.id, body: text },
            });
        } else {
            await prisma.$executeRaw`
                INSERT INTO "feedback" ("id", "user_id", "body", "created_at")
                VALUES (gen_random_uuid()::text, ${user.id}, ${text}, NOW())
            `;
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Feedback POST error:", error);
        return NextResponse.json({ error: "送信に失敗しました" }, { status: 500 });
    }
}
