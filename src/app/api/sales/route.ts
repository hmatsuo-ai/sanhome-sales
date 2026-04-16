import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = getPrisma("sales");

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: Prisma.SaleWhereInput = {};
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
        const session = await auth();
        const creatorId = (session?.user as { id?: string } | undefined)?.id;
        if (!creatorId) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }

        const body = await request.json();
        const { date, projectName, category, salesAmount, grossProfit, settlementDate, isSettled, assigneeIds, profitRatios } = body;
        if (!date || !projectName || !category || salesAmount == null || grossProfit == null) {
            return NextResponse.json(
                { error: "必須項目（担当者・契約日・案件名・カテゴリ・売上・粗利）を入力してください" },
                { status: 400 }
            );
        }
        const connectAssignees = assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0
            ? assigneeIds.map((id: string) => ({ id }))
            : [{ id: creatorId }];

        const sale = await prisma.sale.create({
            data: {
                userId: creatorId,
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
        const message = error instanceof Error ? error.message : "Failed to create sale";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
