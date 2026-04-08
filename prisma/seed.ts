import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'] });

async function main() {
    console.log("🌱 Seeding database with hashed passwords...");

    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create users
    const users = [
        { name: "田中 太郎", email: "tanaka@sanhome.co.jp", password: hashedPassword, role: "sales" },
        { name: "鈴木 花子", email: "suzuki@sanhome.co.jp", password: hashedPassword, role: "sales" },
        { name: "山田 管理", email: "yamada@sanhome.co.jp", password: hashedPassword, role: "admin" },
        { name: "佐藤 次郎", email: "sato@sanhome.co.jp", password: hashedPassword, role: "sales" },
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { password: u.password },
            create: u,
        });
        console.log(`✓ User: ${u.name}`);
    }

    const tanaka = await prisma.user.findUnique({ where: { email: "tanaka@sanhome.co.jp" } });
    const suzuki = await prisma.user.findUnique({ where: { email: "suzuki@sanhome.co.jp" } });

    if (!tanaka || !suzuki) return;

    // Sample sales
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    await prisma.sale.createMany({
        data: [
            {
                userId: tanaka.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 5),
                projectName: "○○ビル 賃貸仲介",
                category: "いい部屋ネット",
                salesAmount: 150000,
                grossProfit: 45000,
            },
            {
                userId: tanaka.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 12),
                projectName: "△△マンション 売買",
                category: "仲介",
                salesAmount: 800000,
                grossProfit: 250000,
            },
            {
                userId: suzuki.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 8),
                projectName: "□□アパート 管理",
                category: "事業利益",
                salesAmount: 320000,
                grossProfit: 128000,
            },
        ],
    });

    // Sample expenses
    await prisma.expense.createMany({
        data: [
            {
                userId: tanaka.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 10),
                category: "交通費",
                amount: 2400,
                memo: "大阪〜京都 往復",
            },
            {
                userId: tanaka.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 14),
                category: "接待費",
                amount: 12800,
                memo: "○○様 会食",
            },
            {
                userId: suzuki.id,
                date: new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 7),
                category: "駐車場代",
                amount: 600,
                memo: "現地内見",
            },
        ],
    });

    // Sample schedules
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(11, 0, 0, 0);

    await prisma.schedule.createMany({
        data: [
            {
                userId: tanaka.id,
                startTime: today,
                endTime: todayEnd,
                title: "○○様 物件案内",
                location: "大阪市北区",
            },
            {
                userId: suzuki.id,
                startTime: new Date(new Date().setHours(14, 0, 0, 0)),
                endTime: new Date(new Date().setHours(15, 30, 0, 0)),
                title: "契約書類確認",
                location: "本社会議室",
            },
        ],
    });

    console.log("✅ Seeding complete!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
