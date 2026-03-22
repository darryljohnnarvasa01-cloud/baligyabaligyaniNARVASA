const ADMIN_TONE_CLASS_MAP = {
  critical: 'border-[#f0b9b9] bg-[#fff1f1] text-[#9b3535]',
  warning: 'border-[#ecd18c] bg-[#fff7de] text-[#8a6400]',
  healthy: 'border-[#bfe1c8] bg-[#edf8f0] text-[#23613a]',
  neutral: 'border-[#ddd5c4] bg-[#f6f3ec] text-[#5f5642]',
}

const ADMIN_TONE_DOT_MAP = {
  critical: 'bg-[#c44a4a]',
  warning: 'bg-[#c18d10]',
  healthy: 'bg-[#2f8a4c]',
  neutral: 'bg-[#8b7f63]',
}

export function getAdminToneClasses(tone = 'neutral') {
  return ADMIN_TONE_CLASS_MAP[tone] || ADMIN_TONE_CLASS_MAP.neutral
}

export function getAdminToneDotClasses(tone = 'neutral') {
  return ADMIN_TONE_DOT_MAP[tone] || ADMIN_TONE_DOT_MAP.neutral
}
