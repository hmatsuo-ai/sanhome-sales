import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { userId, startTime, endTime, title, location } = body;

        const existing = await prisma.schedule.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.userId !== userId)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const updated = await prisma.schedule.update({
            where: { id },
            data: {
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
                title,
                location,
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Schedule PUT error:", error);
        return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
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

        const existing = await prisma.schedule.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (existing.userId !== userId)
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        await prisma.schedule.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Schedule DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
    }
}
