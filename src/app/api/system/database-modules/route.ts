import { auth } from "@/auth";
import {
    DATABASE_MODULE_DEFINITIONS,
    isModuleEnvExplicitlySet,
    usesDefaultDatabaseOnly,
    type AppDbModule,
} from "@/config/database-modules";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const role = (session.user as { role?: string }).role;
        if (role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const modules: {
            id: AppDbModule;
            label: string;
            envKey: string;
            description: string;
            usesDedicatedEnv: boolean;
            healthy: boolean;
            error?: string;
        }[] = [];

        for (const def of DATABASE_MODULE_DEFINITIONS) {
            let healthy = false;
            let error: string | undefined;
            try {
                const client = getPrisma(def.id);
                await client.$queryRaw`SELECT 1`;
                healthy = true;
            } catch (e) {
                error = e instanceof Error ? e.message : "接続に失敗しました";
            }
            modules.push({
                id: def.id,
                label: def.label,
                envKey: def.envKey,
                description: def.description,
                usesDedicatedEnv: isModuleEnvExplicitlySet(def.id),
                healthy,
                error,
            });
        }

        return NextResponse.json({
            allUseSingleDatabase: usesDefaultDatabaseOnly(),
            modules,
        });
    } catch (e) {
        console.error("database-modules GET:", e);
        const message = e instanceof Error ? e.message : "サーバーエラー";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
