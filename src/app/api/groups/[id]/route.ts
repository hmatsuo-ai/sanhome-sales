import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name } = body;
        const group = await prisma.group.update({
            where: { id },
            data: { name },
        });
        return NextResponse.json(group);
    } catch (error) {
        console.error("Groups PUT error:", error);
        return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.group.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Groups DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
    }
}
