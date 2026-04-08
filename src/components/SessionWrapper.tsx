"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({
    children,
    session,
}: {
    children: React.ReactNode;
    session: Session | null;
}) {
    // サーバーで取得したセッションを渡すと、クライアントの useSession が即座に user/id を持つ（読み込み中の null を防ぐ）
    return <SessionProvider session={session}>{children}</SessionProvider>;
}
