import { type AppDbModule, getResolvedDatabaseUrl } from "@/config/database-modules";
import { enhancePostgresUrlForServerlessRuntime } from "@/lib/database-url";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prismaByUrl: Map<string, PrismaClient> | undefined;
};

function createClient(url: string): PrismaClient {
    return new PrismaClient({
        datasources: {
            db: { url },
        },
        log:
            process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
    });
}

/**
 * 機能別のデータベース接続を取得（同一 URL はシングルトン）。
 * 未設定のモジュールはすべて DATABASE_URL にフォールバックします。
 * Neon のプール URL には connect_timeout 等を自動付与（Vercel 上の P1001 緩和）。
 */
export function getPrisma(module: AppDbModule): PrismaClient {
    const resolved = getResolvedDatabaseUrl(module);
    const url = enhancePostgresUrlForServerlessRuntime(resolved);
    if (!globalForPrisma.prismaByUrl) {
        globalForPrisma.prismaByUrl = new Map();
    }
    let client = globalForPrisma.prismaByUrl.get(url);
    if (!client) {
        client = createClient(url);
        globalForPrisma.prismaByUrl.set(url, client);
    }
    return client;
}

/** 認証・ユーザー・グループ（従来の単一 prisma と同じ意味） */
export const prisma = getPrisma("settings");
