import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        const body = await request.json();
        const { userId, date, category, amount, receiptImageUrl, memo } = body;
        const expense = await prisma.expense.create({
            data: {
                userId,
                date: new Date(date),
                category,
                amount: Number(amount),
                receiptImageUrl: receiptImageUrl || null,
                memo: memo || null,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        console.error("Expenses POST error:", error);
        return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
}
