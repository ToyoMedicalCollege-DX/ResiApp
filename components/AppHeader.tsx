"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { displayNameFromUser } from "@/lib/auth-display";
import { USER } from "@/lib/mock-data";

interface AppHeaderProps {
  showBadge?: boolean;
}

function todayLabel() {
  const d = new Date();
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}曜日`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "おはよう";
  if (h < 18) return "こんにちは";
  return "お疲れさま";
}

export default function AppHeader({ showBadge = false }: AppHeaderProps) {
  const [displayName, setDisplayName] = useState(USER.nickname);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setDisplayName(displayNameFromUser(data.user));
    });
  }, []);

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2 bg-bg">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden bg-accent-lt flex items-center justify-center flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png?v=2"
            alt="ResiApp"
            width={44}
            height={44}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-0">
          <span className="text-[12px] text-t3">{todayLabel()}</span>
          <span className="text-[16px] font-bold text-t1 leading-tight">
            {greeting()}、{displayName}！
          </span>
        </div>
      </div>
      <Link href="/settings" className="relative" aria-label="設定">
        <div className="w-10 h-10 rounded-full bg-card shadow-sm flex items-center justify-center">
          <Settings size={20} className="text-t2" />
        </div>
        {showBadge && (
          <span className="absolute top-[2px] right-[2px] w-[10px] h-[10px] rounded-full bg-red-500 border-2 border-bg" />
        )}
      </Link>
    </div>
  );
}
