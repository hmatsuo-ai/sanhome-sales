import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const salesPrisma = getPrisma("sales");
const expensesPrisma = getPrisma("expenses");
const schedulesPrisma = getPrisma("schedules");

/**
 * ダッシュボード用: 期間内の売上・粗利・経費を DB 側で集約し、本日分の予定のみ最小フィールドで返す。
 */
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const todayStart = searchParams.get("todayStart");
        const todayEnd = searchParams.get("todayEnd");

        const saleWhere: Record<string, unknown> = {};
        if (userId) {
            saleWhere.OR = [{ userId }, { assignees: { some: { id: userId } } }];
        }
        if (startDate || endDate) {
            saleWhere.date = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        }

        const expenseWhere: Record<string, unknown> = {};
        if (userId) expenseWhere.userId = userId;
        if (startDate || endDate) {
            expenseWhere.date = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        }

        const scheduleWhere: Record<string, unknown> = {};
        if (userId) scheduleWhere.userId = userId;
        if (todayStart || todayEnd) {
            scheduleWhere.startTime = {
                ...(todayStart && { gte: new Date(todayStart) }),
                ...(todayEnd && { lte: new Date(todayEnd) }),
            };
        }

        const [salesAgg, expenseAgg, todaySchedules] = await Promise.all([
            salesPrisma.sale.aggregate({
                where: saleWhere,
                _sum: { salesAmount: true, grossProfit: true },
            }),
            expensesPrisma.expense.aggregate({
                where: expenseWhere,
                _sum: { amount: true },
            }),
            schedulesPrisma.schedule.findMany({
                where: scheduleWhere,
                select: {
                    id: true,
                    title: true,
                    location: true,
                    startTime: true,
                    endTime: true,
                },
                orderBy: { startTime: "asc" },
            }),
        ]);

        return NextResponse.json({
            salesTotal: salesAgg._sum.salesAmount ?? 0,
            grossProfitTotal: salesAgg._sum.grossProfit ?? 0,
            expenseTotal: expenseAgg._sum.amount ?? 0,
            todaySchedules: todaySchedules.map((s) => ({
                id: s.id,
                title: s.title,
                location: s.location,
                startTime: s.startTime.toISOString(),
                endTime: s.endTime.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Dashboard summary error:", error);
        return NextResponse.json({ error: "集計の取得に失敗しました" }, { status: 500 });
    }
}
