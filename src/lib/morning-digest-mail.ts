import { format } from "date-fns";

export interface MorningDigestScheduleRow {
    title: string;
    startTime: Date;
    endTime: Date;
    location: string;
}

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatTimeRange(start: Date, end: Date): string {
    return `${format(start, "HH:mm")}～${format(end, "HH:mm")}`;
}

export function buildMorningDigestHtml(params: {
    userName: string;
    dateLabel: string;
    schedules: MorningDigestScheduleRow[];
    isTest: boolean;
}): string {
    const preface = params.isTest
        ? "<p style=\"color:#b45309;\"><strong>【テスト送信】</strong> 本メールは手動テストです。</p>"
        : "";
    const rows =
        params.schedules.length === 0
            ? "<p>本日（東京日付）の登録済みスケジュールはありません。</p>"
            : `<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:sans-serif;font-size:14px;">
<thead><tr style="background:#f1f5f9;">
<th style="border:1px solid #e2e8f0;padding:8px;text-align:left;">時間</th>
<th style="border:1px solid #e2e8f0;padding:8px;text-align:left;">件名</th>
<th style="border:1px solid #e2e8f0;padding:8px;text-align:left;">場所</th>
</tr></thead><tbody>
${params.schedules
    .map(
        (s) => `<tr>
<td style="border:1px solid #e2e8f0;padding:8px;white-space:nowrap;">${esc(formatTimeRange(s.startTime, s.endTime))}</td>
<td style="border:1px solid #e2e8f0;padding:8px;">${esc(s.title)}</td>
<td style="border:1px solid #e2e8f0;padding:8px;">${esc(s.location || "—")}</td>
</tr>`
    )
    .join("\n")}
</tbody></table>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body style="font-family:sans-serif;line-height:1.6;color:#334155;">
${preface}
<p>${esc(params.userName)} 様</p>
<p><strong>${esc(params.dateLabel)}</strong>（日本時間）のスケジュールです。</p>
${rows}
<p style="margin-top:24px;font-size:13px;color:#64748b;">
配信の ON / OFF はサンホーム営業管理システムの <strong>設定</strong> から変更できます。<br />
※本メールはスケジュール画面に登録された予定のみをお届けします。
</p>
<p style="margin-top:16px;font-size:12px;color:#94a3b8;">サンホーム 営業統合管理システム</p>
</body></html>`;
}

export function buildMorningDigestSubject(dateLabel: string, isTest: boolean): string {
    if (isTest) {
        return `【テスト】本日の予定のご連絡（${dateLabel}）`;
    }
    return `【サンホーム】本日の予定（${dateLabel}）`;
}
