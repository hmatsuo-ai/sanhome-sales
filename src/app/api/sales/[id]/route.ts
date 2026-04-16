import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const prisma = getPrisma("sales");

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (!session?.user) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }
        if (role !== "admin") {
            return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });
        }

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
        const session = await auth();
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (!session?.user) {
            return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        }
        if (role !== "admin") {
            return NextResponse.json({ error: "管理者のみ操作できます" }, { status: 403 });
        }

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
