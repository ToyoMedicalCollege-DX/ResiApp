"use client";

import { Home, Activity, BookOpen, TrendingUp, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", label: "ホーム", icon: Home },
  { href: "/check", label: "チェック", icon: Activity },
  { href: "/training", label: "トレーニング", icon: BookOpen },
  { href: "/growth", label: "成長記録", icon: TrendingUp },
  { href: "/support", label: "サポート", icon: LifeBuoy },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <div className="flex-shrink-0 bg-bg border-t border-stroke/60 px-2 pt-2 pb-5">
      <div className="flex items-center justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 gap-[4px] py-1"
            >
              <Icon
                size={22}
                color={isActive ? "#E8895B" : "#A89080"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className="text-[10px] leading-none"
                style={{
                  color: isActive ? "#E8895B" : "#A89080",
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
