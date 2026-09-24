"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { displayNameFromUser, withSan } from "@/lib/auth-display";
import { fetchDecryptedProfile } from "@/lib/profile-client";

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
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      try {
        const profile = await fetchDecryptedProfile();
        if (profile?.name) {
          setDisplayName(withSan(profile.name));
          try {
            const prev = localStorage.getItem("resiapp.settings.profile");
            const parsed = prev ? (JSON.parse(prev) as Record<string, string>) : {};
            localStorage.setItem(
              "resiapp.settings.profile",
              JSON.stringify({
                ...parsed,
                name: profile.name,
                department: profile.department || parsed.department || "",
              })
            );
          } catch {
            // ignore
          }
          return;
        }
        if (profile?.decryptError) {
          console.warn("profile decrypt:", profile.decryptError);
        }
      } catch (e) {
        console.warn("profile fetch:", e);
      }

      // 復号できないときは学籍番号表示に落とす（暗号文は出さない）
      setDisplayName(displayNameFromUser(data.user));
    })();
  }, []);

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2 bg-bg">
      <div className="flex flex-col gap-0 min-w-0">
        <span className="text-[12px] text-t3">{todayLabel()}</span>
        <span className="text-[16px] font-bold text-t1 leading-tight truncate">
          {displayName ? `${greeting()}、${displayName}！` : `${greeting()}！`}
        </span>
      </div>
      <Link href="/settings" className="relative flex-shrink-0" aria-label="設定">
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
