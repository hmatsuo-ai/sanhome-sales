import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { userId, date, category, amount, receiptImageUrl, memo } = body;

        // Verify ownership
        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.userId !== userId)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        const existing = await prisma.expense.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.userId !== userId)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await prisma.expense.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Expense DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
}
