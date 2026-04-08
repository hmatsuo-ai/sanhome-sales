import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.startTime = {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            };
        }

        const schedules = await prisma.schedule.findMany({
            where,
            include: { user: { select: { id: true, name: true } } },
            orderBy: { startTime: "asc" },
        });
        return NextResponse.json(schedules);
    } catch (error) {
        console.error("Schedules GET error:", error);
        return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, startTime, endTime, title, location } = body;
        if (!userId || !startTime || !endTime || !title || title.trim() === "") {
            return NextResponse.json(
                { error: "担当者・開始時刻・終了時刻・タイトルは必須です" },
                { status: 400 }
            );
        }
        const schedule = await prisma.schedule.create({
            data: {
                userId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                title,
                location: location || "",
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return NextResponse.json(schedule, { status: 201 });
    } catch (error) {
        console.error("Schedules POST error:", error);
        const message = error instanceof Error ? error.message : "Failed to create schedule";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
