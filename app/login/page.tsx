import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center bg-bg text-t3 text-[14px]">
          読み込み中…
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
