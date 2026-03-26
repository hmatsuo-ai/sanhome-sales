import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { imageBase64, mimeType } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `このレシート画像を解析し、以下の情報をJSON形式で返してください。
必ずJSON形式のみで回答し、他のテキストは含めないでください。

{
  "date": "YYYY-MM-DD形式の日付（不明な場合はnull）",
  "category": "経費カテゴリ（例：飲食費、交通費、駐車場代、接待費、消耗品費、その他）",
  "amount": 合計金額（税込み、数値のみ、不明な場合は0）,
  "memo": "レシートから読み取った店名や用途のメモ（任意）"
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: imageBase64,
                },
            },
        ]);

        const text = result.response.text();
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json(
                { error: "Could not parse OCR result" },
                { status: 422 }
            );
        }

        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
    } catch (error) {
        console.error("OCR error:", error);
        return NextResponse.json(
            { error: "Failed to process receipt image" },
            { status: 500 }
        );
    }
}
