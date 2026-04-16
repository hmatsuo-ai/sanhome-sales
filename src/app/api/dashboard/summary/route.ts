import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import {
    formatYearMonthJa,
    getFiscalHalfYearMonthsTokyo,
    getTokyoYearMonth,
    tokyoMonthRangeUtc,
    tokyoYearMonthKey,
} from "@/lib/tokyoDate";
import { NextResponse } from "next/server";

const salesPrisma = getPrisma("sales");
const expensesPrisma = getPrisma("expenses");
const schedulesPrisma = getPrisma("schedules");
const usersPrisma = getPrisma("settings");

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

        const [salesAgg, expenseAgg, todaySchedules, watchUsers, salesForWatch] = await Promise.all([
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
            usersPrisma.user.findMany({
                where: { isActive: true, role: "sales" },
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            (async () => {
                const halfMonths = getFiscalHalfYearMonthsTokyo();
                if (halfMonths.length === 0) return [];
                const first = halfMonths[0];
                const last = halfMonths[halfMonths.length - 1];
                const { start } = tokyoMonthRangeUtc(first.year, first.month);
                const { end } = tokyoMonthRangeUtc(last.year, last.month);
                return salesPrisma.sale.findMany({
                    where: { date: { gte: start, lte: end } },
                    select: {
                        date: true,
                        userId: true,
                        assignees: { select: { id: true } },
                    },
                });
            })(),
        ]);

        const { year: ty, month: tm, ymKey: currentYmKey } = getTokyoYearMonth();
        const currentMonthLabel = formatYearMonthJa(ty, tm);
        const halfMonths = getFiscalHalfYearMonthsTokyo();
        const halfFirst = halfMonths[0];
        const halfLast = halfMonths[halfMonths.length - 1];
        const fiscalHalfLabel = `${formatYearMonthJa(halfFirst.year, halfFirst.month)}〜${formatYearMonthJa(halfLast.year, halfLast.month)}`;

        const countsByUserMonth = new Map<string, Map<string, number>>();
        const bump = (userId: string, ym: string) => {
            let inner = countsByUserMonth.get(userId);
            if (!inner) {
                inner = new Map();
                countsByUserMonth.set(userId, inner);
            }
            inner.set(ym, (inner.get(ym) ?? 0) + 1);
        };

        for (const s of salesForWatch) {
            const ym = tokyoYearMonthKey(s.date);
            const assigneeIds = s.assignees.map((a) => a.id);
            const creditIds = assigneeIds.length > 0 ? assigneeIds : [s.userId];
            for (const uid of creditIds) {
                bump(uid, ym);
            }
        }

        const currentMonthNoDeals = watchUsers
            .filter((u) => (countsByUserMonth.get(u.id)?.get(currentYmKey) ?? 0) === 0)
            .map((u) => ({ id: u.id, name: u.name }));

        const fiscalHalfGaps: { id: string; name: string; zeroMonths: string[] }[] = [];
        for (const u of watchUsers) {
            const row = countsByUserMonth.get(u.id);
            const zeroMonths: string[] = [];
            for (const { year, month } of halfMonths) {
                const key = `${year}-${String(month).padStart(2, "0")}`;
                if ((row?.get(key) ?? 0) === 0) {
                    zeroMonths.push(formatYearMonthJa(year, month));
                }
            }
            if (zeroMonths.length > 0) {
                fiscalHalfGaps.push({ id: u.id, name: u.name, zeroMonths });
            }
        }

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
            contractWatch: {
                timezone: "Asia/Tokyo",
                currentMonthLabel,
                currentMonthNoDeals,
                fiscalHalfLabel,
                fiscalHalfGaps,
            },
        });
    } catch (error) {
        console.error("Dashboard summary error:", error);
        return NextResponse.json({ error: "集計の取得に失敗しました" }, { status: 500 });
    }
}
