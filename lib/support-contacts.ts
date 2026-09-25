/** 相談窓口の連絡先一覧（サポート画面で表示） */

export type SupportContactItem = {
  label: string;
  value: string;
  href?: string;
  note?: string;
};

export type SupportContactGroup = {
  name: string;
  items: SupportContactItem[];
};

export const SUPPORT_CONTACTS: SupportContactGroup[] = [
  {
    name: "スチューデントサービスセンター",
    items: [
      {
        label: "スマホで予約",
        value: "www.jtsc-ssc.com/yoyaku/so.php",
        href: "https://www.jtsc-ssc.com/yoyaku/so.php",
        note: "24時間受付（受信後返信）",
      },
      {
        label: "電話で予約",
        value: "06-6152-5638",
        href: "tel:0661525638",
        note: "受付時間：月〜金 10:00〜17:00",
      },
      {
        label: "HPで予約",
        value: "www.jtsc-ssc.com",
        href: "https://www.jtsc-ssc.com",
        note: "24時間受付（受信後返信）",
      },
    ],
  },
  {
    name: "慶生会クリニック",
    items: [
      {
        label: "電話",
        value: "06-6533-8118",
        href: "tel:0665338118",
        note: "健康や病気に関すること",
      },
    ],
  },
  {
    name: "寮生活に関すること",
    items: [
      {
        label: "電話",
        value: "06-6245-6781",
        href: "tel:0662456781",
      },
    ],
  },
  {
    name: "教務部 / 事務局",
    items: [
      {
        label: "電話",
        value: "06-6398-2255",
        href: "tel:0663982255",
      },
    ],
  },
];
