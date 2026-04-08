import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const prisma = getPrisma("expenses");

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const month = searchParams.get("month"); // legacy format: YYYY-MM
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;

        if (startDate || endDate) {
            where.date = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        } else if (month) {
            const [year, m] = month.split("-").map(Number);
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 1);
            where.date = { gte: start, lt: end };
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: { user: { select: { id: true, name: true } } },
            orderBy: { date: "desc" },
        });
        return NextResponse.json(expenses);
    } catch (error) {
        console.error("Expenses GET error:", error);
        return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        const ownerId = (session?.user as { id?: string } | undefined)?.id;
        if (!ownerId) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }

        const body = await request.json();
        const { date, category, amount, receiptImageUrl, memo } = body;
        if (!date || category == null || amount == null) {
            return NextResponse.json(
                { error: "date, category, amount は必須です" },
                { status: 400 }
            );
        }
        const numAmount = Number(amount);
        if (Number.isNaN(numAmount) || numAmount < 0) {
            return NextResponse.json({ error: "金額は0以上の数値で入力してください" }, { status: 400 });
        }
        const expense = await prisma.expense.create({
            data: {
                userId: ownerId,
                date: new Date(date),
                category,
                amount: numAmount,
                receiptImageUrl: receiptImageUrl || null,
                memo: memo || null,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error("Expenses POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to create expense";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
