import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { isSettled } = body;
        const sale = await prisma.sale.update({
            where: { id },
            data: {
                isSettled: isSettled !== undefined ? isSettled : undefined
            },
            include: {
                user: { select: { id: true, name: true } },
                assignees: { select: { id: true, name: true } }
            },
        });
        return NextResponse.json(sale);
    } catch (error) {
        console.error("Sales PUT error:", error);
        return NextResponse.json({ error: "Failed to update sale status" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.sale.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Sales DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
    }
}
