/** クライアントからプロフィール（復号済み名前）を取得 */

export type ClientProfile = {
  name: string;
  department: string;
  studentId: string;
  nameEncrypted: boolean;
  decryptError?: string;
};

export async function fetchDecryptedProfile(): Promise<ClientProfile | null> {
  const res = await fetch("/api/profile", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as Partial<ClientProfile> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(body.error || `プロフィール取得に失敗しました (${res.status})`);
  }
  return {
    name: typeof body.name === "string" ? body.name : "",
    department: typeof body.department === "string" ? body.department : "",
    studentId: typeof body.studentId === "string" ? body.studentId : "",
    nameEncrypted: Boolean(body.nameEncrypted),
    decryptError:
      typeof body.decryptError === "string" ? body.decryptError : undefined,
  };
}
