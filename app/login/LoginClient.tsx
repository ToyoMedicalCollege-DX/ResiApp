"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  isValidStudentId,
  studentIdToEmail,
} from "@/lib/student-auth";

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login"))
    return "学籍番号またはパスワードが違います";
  if (m.includes("email not confirmed"))
    return "アカウントの有効化が完了していません。Authentication の Confirm email をOFFにするか、管理者に連絡してください";
  if (
    m.includes("rate limit") ||
    m.includes("security purposes") ||
    (m.includes("after") && m.includes("second"))
  ) {
    return "試行が多すぎます。数分待ってから再度お試しください";
  }
  return message || "ログインに失敗しました";
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/home";
  const presetError = searchParams.get("error");

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    presetError === "auth_callback"
      ? "認証リンクの処理に失敗しました。もう一度ログインしてください"
      : ""
  );

  const canSubmit = useMemo(
    () =>
      isValidStudentId(studentId) && password.length >= 6 && !loading,
    [studentId, password, loading]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: studentIdToEmail(studentId),
        password,
      });
      if (signInError) {
        setError(mapAuthError(signInError.message));
        setLoading(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/home");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4">
        <Link href="/" aria-label="戻る" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-t1" />
        </Link>
        <h1 className="text-[18px] font-bold text-t1">ログイン</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[14px] text-t2 mb-6 leading-relaxed">
          学籍番号とパスワードで入ります。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">学籍番号</span>
            <input
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="characters"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="例：A1234567"
              className="h-12 rounded-2xl border-2 border-stroke bg-card px-4 text-[15px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent tracking-wide"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">パスワード</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6文字以上"
                className="h-12 w-full rounded-2xl border-2 border-stroke bg-card pl-4 pr-12 text-[15px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-t3 hover:text-t2"
                aria-label={
                  showPassword ? "パスワードを隠す" : "パスワードを表示"
                }
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="text-[13px] font-semibold text-[#C45C2A] bg-accent-lt rounded-2xl px-3 py-2.5">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold disabled:opacity-40 mt-2"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/forgot-password"
            className="text-[13px] font-semibold text-accent"
          >
            パスワードを忘れた場合
          </Link>
          <p className="text-[13px] text-t3">
            アカウント未作成の方は{" "}
            <Link href="/signup" className="font-bold text-accent">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
