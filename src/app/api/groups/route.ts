import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const groups = await prisma.group.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        });
        return NextResponse.json(groups);
    } catch (error) {
        console.error("Groups GET error:", error);
        return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const group = await prisma.group.create({
            data: { name },
        });
        return NextResponse.json(group, { status: 201 });
    } catch (error) {
        console.error("Groups POST error:", error);
        return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
    }
}
