"use client";

import { useState } from "react";

export default function FeedbackPage() {
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<"success" | "error" | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) {
            setMessage("error");
            return;
        }
        setSending(true);
        setMessage(null);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: text }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setBody("");
                setMessage("success");
            } else {
                setMessage("error");
                if (data.error) alert(data.error);
            }
        } catch {
            setMessage("error");
            alert("送信に失敗しました。");
        } finally {
            setSending(false);
        }
    };

    // 認可は (app)/layout の auth() に任せる。useSession はハイドレーションで一時的に unauthenticated になり得るためここでは使わない。

    return (
        <div className="max-w-xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">修正依頼</h1>
            <p className="text-gray-500 text-sm mb-6">
                要望や不具合の報告を開発者へ送信できます。内容を入力して送信してください。
            </p>
            <div className="card p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="feedback-body" className="form-label text-xs font-bold text-gray-500 mb-1">
                            内容（要望・修正依頼など）
                        </label>
                        <textarea
                            id="feedback-body"
                            className="form-input py-3 min-h-[160px] resize-y"
                            placeholder="例：〇〇の画面で△△のように表示したいです。"
                            value={body}
                            onChange={e => setBody(e.target.value)}
                            disabled={sending}
                        />
                    </div>
                    {message === "success" && (
                        <p className="text-sm text-green-600">送信しました。ご協力ありがとうございます。</p>
                    )}
                    {message === "error" && (
                        <p className="text-sm text-red-600">内容を入力するか、しばらく経ってから再度お試しください。</p>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={sending || !body.trim()}
                        >
                            {sending ? "送信中..." : "送信"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
