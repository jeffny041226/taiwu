import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from "@/config/game";

/**
 * 基于 UID 的 hash 生成固定5位房间号
 * 每个用户有固定的房间号，不变的
 */
export function generateRoomCode(uid: string): string {
  // 简单的字符串 hash 转 base-N
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0xffffffff;
  }
  // 确保正数
  hash = Math.abs(hash);

  const base = ROOM_CODE_CHARSET.length;
  let code = "";
  let remaining = hash;

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code = ROOM_CODE_CHARSET[remaining % base] + code;
    remaining = Math.floor(remaining / base);
  }

  return code;
}

/**
 * 校验房间号是否合法
 */
export function validateRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (const char of code) {
    if (!ROOM_CODE_CHARSET.includes(char)) return false;
  }
  return true;
}
