import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

function buildFilename(originalName: string) {
    const timestamp = Date.now();
    const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1e9)}`;
    const extension = originalName.split(".").pop() || "bin";
    return `${uniqueSuffix}.${extension}`;
}

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        const filename = buildFilename(file.name);

        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        const onVercel = Boolean(process.env.VERCEL);
        if (onVercel && !blobToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Vercel 本番では BLOB_READ_WRITE_TOKEN が必要です（Storage → Blob を接続）",
                },
                { status: 500 },
            );
        }

        // 本番（Vercel）: Vercel Blob。ローカル: public/uploads
        if (blobToken) {
            const blob = await put(`receipts/${filename}`, file, {
                access: "public",
                token: blobToken,
            });
            return NextResponse.json({ success: true, url: blob.url });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (dirError) {
            console.error("Error creating uploads directory:", dirError);
        }

        const filePath = join(uploadDir, filename);
        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/${filename}`;
        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
    }
}
