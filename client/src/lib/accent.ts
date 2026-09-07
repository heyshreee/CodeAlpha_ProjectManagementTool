export const ACCENT_IDS = ['violet', 'blue', 'emerald', 'rose', 'amber', 'cyan'] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

const STORAGE_KEY = 'pf-accent';

// Per-accent overrides for the most-used brand stops.
const BRAND_STOPS: Record<AccentId, Record<string, string>> = {
  violet: { '500': '#7c5cfc', '400': '#9b83ff', '300': '#b6a3ff', '600': '#6947e8', '700': '#5637c4' },
  blue: { '500': '#3b82f6', '400': '#60a5fa', '300': '#93c5fd', '600': '#2563eb', '700': '#1d4ed8' },
  emerald: { '500': '#10b981', '400': '#34d399', '300': '#6ee7b7', '600': '#059669', '700': '#047857' },
  rose: { '500': '#f43f5e', '400': '#fb7185', '300': '#fda4af', '600': '#e11d48', '700': '#be123c' },
  amber: { '500': '#f59e0b', '400': '#fbbf24', '300': '#fcd34d', '600': '#d97706', '700': '#b45309' },
  cyan: { '500': '#06b6d4', '400': '#22d3ee', '300': '#67e8f9', '600': '#0891b2', '700': '#0e7490' },
};

export function isAccentId(value: string | null | undefined): value is AccentId {
  return ACCENT_IDS.includes(value as AccentId);
}

export function normalizeAccent(value: string | null | undefined): AccentId {
  return isAccentId(value) ? value : 'violet';
}

export function getLocalAccent(): AccentId {
  return normalizeAccent(localStorage.getItem(STORAGE_KEY));
}

export function applyAccent(id: AccentId) {
  localStorage.setItem(STORAGE_KEY, id);
  let brand = document.getElementById('pf-brand-sheet') as HTMLStyleElement | null;
  if (!brand) {
    brand = document.createElement('style');
    brand.id = 'pf-brand-sheet';
    document.head.appendChild(brand);
  }
  const stops = BRAND_STOPS[normalizeAccent(id)];
  brand.textContent = Object.entries(stops)
    .map(([k, v]) => `:root { --color-brand-${k}: ${v}; }`)
    .join('\n');
}
