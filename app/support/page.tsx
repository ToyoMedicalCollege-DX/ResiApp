"use client";

import { ChevronRight, Phone } from "lucide-react";
import TabBar from "@/components/TabBar";
import { SUPPORT_CONTACTS } from "@/lib/support-contacts";
import { logSupportLinkClick } from "@/lib/support-clicks";

export default function SupportPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg">
      <div className="flex-shrink-0 px-4 py-4 bg-card shadow-sm">
        <h1 className="text-[18px] font-bold text-t1">サポート</h1>
        <p className="text-[12px] text-t3 mt-1">
          つらいときはひとりで抱えなくて大丈夫です
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-5 pb-8">
          <section className="bg-card rounded-3xl overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 flex items-center gap-3 border-b border-stroke">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                <Phone size={20} color="#D97706" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-t1">相談窓口</p>
                <p className="text-[12px] text-t3">
                  必要に応じて連絡・予約できます
                </p>
              </div>
            </div>

            <div className="divide-y divide-stroke">
              {SUPPORT_CONTACTS.map((group) => (
                <div key={group.name} className="px-4 py-4 flex flex-col gap-3">
                  <p className="text-[14px] font-bold text-t1">{group.name}</p>
                  <div className="flex flex-col gap-2.5">
                    {group.items.map((item) => {
                      const content = (
                        <>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-t3">
                              {item.label}
                            </p>
                            <p className="text-[14px] font-bold text-accent break-all mt-0.5">
                              {item.value}
                            </p>
                            {item.note ? (
                              <p className="text-[11px] text-t3 mt-0.5">
                                {item.note}
                              </p>
                            ) : null}
                          </div>
                          {item.href ? (
                            <ChevronRight
                              size={16}
                              className="text-t3 flex-shrink-0 mt-1"
                            />
                          ) : null}
                        </>
                      );

                      if (item.href) {
                        const external = item.href.startsWith("http");
                        const linkKey = `${group.name}-${item.label}`
                          .replace(/\s+/g, "_")
                          .toLowerCase();
                        return (
                          <a
                            key={`${group.name}-${item.label}`}
                            href={item.href}
                            {...(external
                              ? {
                                  target: "_blank",
                                  rel: "noopener noreferrer",
                                }
                              : {})}
                            onClick={() => {
                              void logSupportLinkClick({
                                linkKey,
                                linkLabel: item.label,
                                href: item.href!,
                                groupName: group.name,
                              });
                            }}
                            className="rounded-2xl bg-bg px-3 py-2.5 flex items-start justify-between gap-2"
                          >
                            {content}
                          </a>
                        );
                      }

                      return (
                        <div
                          key={`${group.name}-${item.label}`}
                          className="rounded-2xl bg-bg px-3 py-2.5"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <TabBar />
    </div>
  );
}
