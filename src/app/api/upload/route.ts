import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate a unique filename using timestamp and original name
        const timestamp = Date.now();
        const uniqueSuffix = `${timestamp}-${Math.round(Math.random() * 1e9)}`;
        const extension = file.name.split(".").pop();
        const filename = `${uniqueSuffix}.${extension}`;

        const uploadDir = join(process.cwd(), "public", "uploads");

        // Ensure the directory exists
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (dirError) {
            console.error("Error creating uploads directory:", dirError);
        }

        const filePath = join(uploadDir, filename);

        // Save the file
        await writeFile(filePath, buffer);

        // Return the public URL path
        const fileUrl = `/uploads/${filename}`;

        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
    }
}
