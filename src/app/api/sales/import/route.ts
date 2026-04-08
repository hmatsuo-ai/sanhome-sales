import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const prisma = getPrisma("sales");

interface SaleRow {
    userId: string;
    date: string;
    projectName: string;
    category: string;
    salesAmount: string | number;
    grossProfit: string | number;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { rows }: { rows: SaleRow[] } = body;

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No rows provided" }, { status: 400 });
        }

        const data = rows.map((row) => ({
            userId: row.userId,
            date: new Date(row.date),
            projectName: row.projectName,
            category: row.category,
            salesAmount: Number(row.salesAmount),
            grossProfit: Number(row.grossProfit),
        }));
        const result = await prisma.sale.createMany({ data });

        return NextResponse.json({ imported: result.count }, { status: 201 });
    } catch (error) {
        console.error("Sales import error:", error);
        return NextResponse.json({ error: "Failed to import sales" }, { status: 500 });
    }
}
