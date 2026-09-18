"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => password.length >= 6 && !loading,
    [password, loading]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      router.replace("/home");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 px-5 py-4">
        <h1 className="text-[18px] font-bold text-t1">新しいパスワード</h1>
      </div>
      <div className="flex-1 px-5">
        <p className="text-[14px] text-t2 mb-6">
          新しいパスワードを入力してください（6文字以上）。
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="h-12 rounded-2xl border-2 border-stroke bg-card px-4 text-[15px] text-t1 focus:outline-none focus:border-accent"
          />
          {error ? (
            <p className="text-[13px] font-semibold text-[#C45C2A] bg-accent-lt rounded-2xl px-3 py-2.5">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold disabled:opacity-40"
          >
            {loading ? "保存中…" : "パスワードを更新"}
          </button>
        </form>
      </div>
    </div>
  );
}
