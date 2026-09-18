export const DEPARTMENTS = [
  "歯科技工士学科",
  "救急救命士学科",
  "鍼灸師学科",
  "柔道整復師学科",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}
