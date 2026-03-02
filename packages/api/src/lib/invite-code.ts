import { randomBytes } from "crypto";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateInviteCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i]! % CHARS.length];
  }
  return code;
}
