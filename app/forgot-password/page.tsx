"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4">
        <Link href="/login" aria-label="戻る" className="p-1 -ml-1">
          <ChevronLeft size={24} className="text-t1" />
        </Link>
        <h1 className="text-[18px] font-bold text-t1">パスワード再設定</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="bg-card rounded-3xl p-5 shadow-sm flex flex-col gap-3">
          <p className="text-[14px] text-t1 font-semibold leading-relaxed">
            学籍番号ログインでは、アプリからの自動再設定メールは使えません。
          </p>
          <p className="text-[13px] text-t2 leading-relaxed">
            パスワードを忘れた場合は、学校の教務・事務局、またはアプリ管理者に問い合わせてください。
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 h-12 rounded-[24px] bg-accent text-white text-[15px] font-bold flex items-center justify-center"
        >
          ログインへ戻る
        </Link>
      </div>
    </div>
  );
}
