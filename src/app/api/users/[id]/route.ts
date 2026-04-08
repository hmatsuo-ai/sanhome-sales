import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                groupId: true,
                createdAt: true,
                group: true,
            },
        });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
        return NextResponse.json(user);
    } catch (error) {
        console.error("User GET error:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        const currentUserId = (session?.user as { id?: string } | undefined)?.id;
        const { id } = await params;
        const body = await request.json();
        const { name, email, role, groupId, password, currentPassword, isActive } = body;

        if (!currentUserId) return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        const isSelf = currentUserId === id;
        const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
        const isAdmin = currentUser?.role === "admin";
        if (!isSelf && !isAdmin) {
            return NextResponse.json({ error: "編集する権限がありません" }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) {
            if (!isAdmin) return NextResponse.json({ error: "権限の変更は管理者のみ可能です" }, { status: 403 });
            updateData.role = role;
        }
        if (groupId !== undefined) {
            if (!isAdmin) return NextResponse.json({ error: "所属の変更は管理者のみ可能です" }, { status: 403 });
            updateData.groupId = groupId || null;
        }
        if (isActive !== undefined) {
            if (!isAdmin) return NextResponse.json({ error: "凍結の変更は管理者のみ可能です" }, { status: 403 });
            updateData.isActive = Boolean(isActive);
        }
        if (password !== undefined && password !== "") {
            const newPwd = String(password).trim();
            if (newPwd.length < 6) {
                return NextResponse.json({ error: "新しいパスワードは6文字以上で入力してください" }, { status: 400 });
            }
            if (isSelf) {
                const currentPwd = typeof currentPassword === "string" ? currentPassword : "";
                if (!currentPwd) {
                    return NextResponse.json({ error: "現在のパスワードを入力してください" }, { status: 400 });
                }
                const existing = await prisma.user.findUnique({ where: { id }, select: { password: true } });
                if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });
                const match = await bcrypt.compare(currentPwd, existing.password);
                if (!match) {
                    return NextResponse.json({ error: "現在のパスワードが正しくありません" }, { status: 400 });
                }
            }
            updateData.password = await bcrypt.hash(newPwd, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                groupId: true,
                createdAt: true,
                group: true,
            },
        });
        return NextResponse.json(user);
    } catch (error) {
        console.error("Users PUT error:", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        const currentUserId = (session?.user as { id?: string } | undefined)?.id;
        if (!currentUserId) return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
        const { id } = await params;
        const currentUser = await prisma.user.findUnique({ where: { id: currentUserId }, select: { role: true } });
        const isAdmin = currentUser?.role === "admin";
        const isSelf = currentUserId === id;
        if (!isSelf && !isAdmin) return NextResponse.json({ error: "削除する権限がありません" }, { status: 403 });
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Users DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

