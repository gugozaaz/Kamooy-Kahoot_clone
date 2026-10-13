// Player avatar generator with playful emojis and vibrant theme colors
export const AVATAR_LIST = [
  { emoji: '🦊', label: 'จิ้งจอก', bg: 'linear-gradient(135deg, #ff7e5f, #feb47b)' },
  { emoji: '🐯', label: 'เสือ', bg: 'linear-gradient(135deg, #f7971e, #ffd200)' },
  { emoji: '🦁', label: 'สิงโต', bg: 'linear-gradient(135deg, #f857a6, #ff5858)' },
  { emoji: '🐼', label: 'แพนด้า', bg: 'linear-gradient(135deg, #2c3e50, #4ca1af)' },
  { emoji: '🦄', label: 'ยูนิคอร์น', bg: 'linear-gradient(135deg, #da22ff, #9733ee)' },
  { emoji: '🚀', label: 'จรวด', bg: 'linear-gradient(135deg, #00c6ff, #0072ff)' },
  { emoji: '⚡', label: 'สายฟ้า', bg: 'linear-gradient(135deg, #f7971e, #ffd200)' },
  { emoji: '🔥', label: 'เปลวไฟ', bg: 'linear-gradient(135deg, #ff416c, #ff4b2b)' },
  { emoji: '👑', label: 'มงกุฎ', bg: 'linear-gradient(135deg, #ffe259, #ffa751)' },
  { emoji: '👾', label: 'เอเลี่ยน', bg: 'linear-gradient(135deg, #a8ff78, #78ffd6)' },
  { emoji: '🥑', label: 'อะโวคาโด', bg: 'linear-gradient(135deg, #56ab2f, #a8e063)' },
  { emoji: '🍕', label: 'พิซซ่า', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
  { emoji: '🛸', label: 'ยูเอฟโอ', bg: 'linear-gradient(135deg, #8a2387, #e94057)' },
  { emoji: '🎯', label: 'เป้าบิน', bg: 'linear-gradient(135deg, #e52d27, #b31217)' },
  { emoji: '💎', label: 'เพชร', bg: 'linear-gradient(135deg, #4ac29a, #bdfff3)' },
  { emoji: '🐲', label: 'มังกร', bg: 'linear-gradient(135deg, #11998e, #38ef7d)' }
];

export function getAvatar(nickname = '') {
  if (!nickname) return AVATAR_LIST[0];
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = (hash << 5) - hash + nickname.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_LIST.length;
  return AVATAR_LIST[index];
}
