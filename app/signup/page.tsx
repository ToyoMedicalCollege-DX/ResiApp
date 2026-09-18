"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  isValidStudentId,
  normalizeStudentId,
  studentIdToEmail,
} from "@/lib/student-auth";
import { DEPARTMENTS, isDepartment } from "@/lib/departments";

const PROFILE_KEY = "resiapp.settings.profile";

function mapSignUpError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "この学籍番号はすでに登録されています";
  if (m.includes("password")) return "パスワードは6文字以上にしてください";
  if (
    m.includes("rate limit") ||
    m.includes("security purposes") ||
    (m.includes("after") && m.includes("second")) ||
    (m.includes("email") && m.includes("rate"))
  ) {
    return "登録の試行が多すぎます（メール送信制限）。Authentication → Providers → Email で「Confirm email」をOFFにし、数分〜最大1時間ほど待ってから再度お試しください。";
  }
  return message || "登録に失敗しました";
}

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 1 &&
      isDepartment(department) &&
      isValidStudentId(studentId) &&
      password.length >= 6 &&
      !loading,
    [name, department, studentId, password, loading]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const id = normalizeStudentId(studentId);
      const trimmedName = name.trim();
      const trimmedDept = department;
      if (!isDepartment(trimmedDept)) {
        setError("所属学科を選択してください");
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: studentIdToEmail(id),
        password,
        options: {
          data: {
            name: trimmedName,
            nickname: trimmedName, // 後方互換
            department: trimmedDept,
            student_id: id,
          },
        },
      });
      if (signUpError) {
        setError(mapSignUpError(signUpError.message));
        setLoading(false);
        return;
      }

      try {
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify({ name: trimmedName, department: trimmedDept })
        );
      } catch {
        // ignore
      }

      if (data.session) {
        router.replace("/home");
        router.refresh();
        return;
      }

      setInfo(
        "登録を受け付けました。すぐログインできない場合は、Supabase の「Confirm email」をオフにするか、管理者に連絡してください。"
      );
      setLoading(false);
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
        <h1 className="text-[18px] font-bold text-t1">新規登録</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[14px] text-t2 mb-6 leading-relaxed">
          名前・所属学科・学籍番号を登録します。
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">名前</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山田 太郎"
              maxLength={40}
              className="h-12 rounded-2xl border-2 border-stroke bg-card px-4 text-[15px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-t2">所属学科</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-12 rounded-2xl border-2 border-stroke bg-card px-4 text-[15px] text-t1 focus:outline-none focus:border-accent"
              required
            >
              <option value="" disabled>
                選択してください
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

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
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className="h-12 rounded-2xl border-2 border-stroke bg-card px-4 text-[15px] text-t1 placeholder:text-t3 focus:outline-none focus:border-accent"
              required
              minLength={6}
            />
          </label>

          {error ? (
            <p className="text-[13px] font-semibold text-[#C45C2A] bg-accent-lt rounded-2xl px-3 py-2.5">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-[13px] font-semibold text-t2 bg-[#E8F5E9] rounded-2xl px-3 py-2.5">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold disabled:opacity-40 mt-2"
          >
            {loading ? "登録中…" : "アカウントを作る"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-t3">
          すでにアカウントがある方は{" "}
          <Link href="/login" className="font-bold text-accent">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
