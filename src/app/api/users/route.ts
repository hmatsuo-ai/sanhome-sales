import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
    try {
        const users = await prisma.user.findMany({
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
            orderBy: { name: "asc" },
        });
        return NextResponse.json(users);
    } catch (error) {
        console.error("Users GET error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, role, password } = body;

        const hashedPassword = await bcrypt.hash(password || "password123", 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || "sales"
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                groupId: true,
                createdAt: true,
            },
        });
        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("Users POST error:", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

