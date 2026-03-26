import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: any = {};
        if (userId) {
            // User can be the creator OR one of the assignees
            where.OR = [
                { userId: userId },
                { assignees: { some: { id: userId } } }
            ];
        }
        if (startDate || endDate) {
            where.date = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        }

        const sales = await prisma.sale.findMany({
            where,
            include: {
                user: { select: { id: true, name: true } },
                assignees: { select: { id: true, name: true } }
            },
            orderBy: { date: "desc" },
        });
        return NextResponse.json(sales);
    } catch (error) {
        console.error("Sales GET error:", error);
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, date, projectName, category, salesAmount, grossProfit, settlementDate, isSettled, assigneeIds, profitRatios } = body;

        const connectAssignees = assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0
            ? assigneeIds.map((id: string) => ({ id }))
            : [{ id: userId }];

        const sale = await prisma.sale.create({
            data: {
                userId,
                date: new Date(date),
                projectName,
                category,
                salesAmount: Number(salesAmount),
                grossProfit: Number(grossProfit),
                settlementDate: settlementDate ? new Date(settlementDate) : new Date(),
                isSettled: isSettled || false,
                profitRatios: profitRatios ? JSON.stringify(profitRatios) : null,
                assignees: {
                    connect: connectAssignees
                }
            },
            include: {
                user: { select: { id: true, name: true } },
                assignees: { select: { id: true, name: true } }
            },
        });
        return NextResponse.json(sale, { status: 201 });
    } catch (error) {
        console.error("Sales POST error:", error);
        return NextResponse.json({ error: "Failed to create sale" }, { status: 500 });
    }
}
