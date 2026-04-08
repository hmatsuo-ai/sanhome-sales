import { auth } from "@/auth";
import { NextResponse } from "next/server";

/** クライアントの useSession に id が載らない場合でも、サーバーセッションで確実にユーザーを返す */
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const u = session.user as { id?: string; email?: string | null; name?: string | null; role?: string };
    if (!u.id) {
        return NextResponse.json({ error: "Session has no user id" }, { status: 500 });
    }
    return NextResponse.json({
        id: u.id,
        email: u.email ?? "",
        name: u.name ?? "",
        role: u.role ?? "sales",
    });
}
