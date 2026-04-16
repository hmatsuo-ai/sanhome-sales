import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const prisma = getPrisma("expenses");

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (!session?.user) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }
        if (role !== "admin") {
            return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { date, category, amount, receiptImageUrl, memo } = body;

        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                date: date ? new Date(date) : undefined,
                category,
                amount: amount ? Number(amount) : undefined,
                receiptImageUrl: receiptImageUrl ?? undefined,
                memo: memo ?? undefined,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Expense PUT error:", error);
        return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (!session?.user) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }
        if (role !== "admin") {
            return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });
        }

        const { id } = await params;

        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

        await prisma.expense.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Expense DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
}
