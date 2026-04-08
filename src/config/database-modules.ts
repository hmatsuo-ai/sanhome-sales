/**
 * 機能ごとに別の PostgreSQL（例: Neon の別データベース／ブランチ）を指す URL を環境変数で指定できます。
 * 未設定の場合はすべて DATABASE_URL にフォールバックします（従来どおり1本で運用）。
 *
 * 注意: Prisma スキーマは User と各テーブルが外部キーで結ばれています。
 * 別 DB に分ける場合は、各 DB に同一マイグレーションを適用し、users など整合が取れるようにしてください。
 * 運用が複雑になるため、通常は DATABASE_URL のみの利用を推奨します。
 */

export type AppDbModule =
    | "settings"
    | "expenses"
    | "sales"
    | "schedules"
    | "dashboard";

export type ModuleDefinition = {
    id: AppDbModule;
    /** 設定画面・API 表示用 */
    label: string;
    /** 環境変数名（接続先を上書きする場合） */
    envKey: string;
    description: string;
};

export const DATABASE_MODULE_DEFINITIONS: ModuleDefinition[] = [
    {
        id: "settings",
        label: "設定・認証・ユーザー",
        envKey: "DATABASE_URL_SETTINGS",
        description: "ログイン、ユーザー・グループ管理（未設定時は DATABASE_URL）",
    },
    {
        id: "expenses",
        label: "経費精算",
        envKey: "DATABASE_URL_EXPENSES",
        description: "経費データ（未設定時は DATABASE_URL）",
    },
    {
        id: "sales",
        label: "売上管理",
        envKey: "DATABASE_URL_SALES",
        description: "売上データ（未設定時は DATABASE_URL）",
    },
    {
        id: "schedules",
        label: "スケジュール",
        envKey: "DATABASE_URL_SCHEDULES",
        description: "予定データ（未設定時は DATABASE_URL）",
    },
    {
        id: "dashboard",
        label: "ダッシュボード・フィードバック",
        envKey: "DATABASE_URL_DASHBOARD",
        description: "要望・修正依頼など（未設定時は DATABASE_URL）",
    },
];

function requiredDatabaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url?.trim()) {
        throw new Error("DATABASE_URL が設定されていません");
    }
    return url.trim();
}

/** 空文字は未設定とみなしフォールバックする（Vercel で誤って "" を入れた場合の事故防止） */
function pickUrl(optional: string | undefined, fallback: string): string {
    const t = optional?.trim();
    return t ? t : fallback;
}

/** モジュールに割り当てる接続 URL（プール用） */
export function getResolvedDatabaseUrl(module: AppDbModule): string {
    const fallback = requiredDatabaseUrl();
    switch (module) {
        case "settings":
            return pickUrl(process.env.DATABASE_URL_SETTINGS, fallback);
        case "expenses":
            return pickUrl(process.env.DATABASE_URL_EXPENSES, fallback);
        case "sales":
            return pickUrl(process.env.DATABASE_URL_SALES, fallback);
        case "schedules":
            return pickUrl(process.env.DATABASE_URL_SCHEDULES, fallback);
        case "dashboard":
            return pickUrl(process.env.DATABASE_URL_DASHBOARD, fallback);
        default:
            return fallback;
    }
}

/** 既定（設定）DB と同一 URL か（分割運用していないか） */
export function usesDefaultDatabaseOnly(): boolean {
    const base = requiredDatabaseUrl();
    return DATABASE_MODULE_DEFINITIONS.every((m) => getResolvedDatabaseUrl(m.id) === base);
}

/** 環境変数が明示的に設定されているか（フォールバックではないか） */
export function isModuleEnvExplicitlySet(module: AppDbModule): boolean {
    switch (module) {
        case "settings":
            return Boolean(process.env.DATABASE_URL_SETTINGS?.trim());
        case "expenses":
            return Boolean(process.env.DATABASE_URL_EXPENSES?.trim());
        case "sales":
            return Boolean(process.env.DATABASE_URL_SALES?.trim());
        case "schedules":
            return Boolean(process.env.DATABASE_URL_SCHEDULES?.trim());
        case "dashboard":
            return Boolean(process.env.DATABASE_URL_DASHBOARD?.trim());
        default:
            return false;
    }
}

/** マイグレーション実行時に使う一意の接続 URL 一覧（重複除去） */
export function collectUniqueMigrationUrls(): string[] {
    const set = new Set<string>();
    for (const m of DATABASE_MODULE_DEFINITIONS) {
        try {
            set.add(getResolvedDatabaseUrl(m.id));
        } catch {
            /* DATABASE_URL 未設定時は空 */
        }
    }
    return Array.from(set);
}
