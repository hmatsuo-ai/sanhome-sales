import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().trim().min(1, "名前を入力してください").max(100, "名前は100文字以内にしてください"),
    email: z.string().trim().email("有効なメールアドレスを入力してください"),
    password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

/**
 * 公開の新規登録（ログイン画面から）。ロールは常に営業のみ。
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error.flatten().fieldErrors;
            const first =
                msg.name?.[0] ?? msg.email?.[0] ?? msg.password?.[0] ?? "入力内容を確認してください";
            return NextResponse.json({ error: first }, { status: 400 });
        }

        const { name, email, password } = parsed.data;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "このメールアドレスは既に登録されています" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "sales",
            },
        });

        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (error) {
        console.error("POST /api/auth/register:", error);
        return NextResponse.json({ error: "登録に失敗しました。しばらくしてから再度お試しください。" }, { status: 500 });
    }
}
