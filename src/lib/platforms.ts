export const TARGET_NETWORKS_AND_PLATFORMS = [
  // EE. UU. / Internacional
  'The CW',
  'ABC',
  'CBS',
  'NBC',
  'FOX',
  'AMC',
  'FX',
  'Starz',
  'Freeform',
  'Showtime',
  'Netflix',
  'Prime Video',
  'HBO',
  'HBO Max',
  'Disney',
  'Disney+',
  'Hulu',
  'Apple TV',
  'Paramount',
  'Paramount+',
  'Peacock',
  'SkyShowtime',
  // España
  'RTVE Play',
  'Atresmedia',
  'Mediaset',
  'Movistar Plus+',
  'Filmin',
] as const;

const ALIAS_MAP: Record<string, string> = {
  // EE. UU. / Internacional
  'cw': 'The CW',
  'the cw': 'The CW',
  'abc': 'ABC',
  'cbs': 'CBS',
  'nbc': 'NBC',
  'fox': 'FOX',
  'fox (us)': 'FOX',
  'amc': 'AMC',
  'amc+': 'AMC',
  'fx': 'FX',
  'fx networks': 'FX',
  'fxx': 'FX',
  'starz': 'Starz',
  'freeform': 'Freeform',
  'showtime': 'Showtime',
  'netflix': 'Netflix',
  'amazon prime video': 'Prime Video',
  'prime video': 'Prime Video',
  'hbo': 'HBO',
  'hbo max': 'HBO Max',
  'max': 'HBO Max',
  'disney': 'Disney',
  'disney+': 'Disney+',
  'disney plus': 'Disney+',
  'hulu': 'Hulu',
  'apple tv': 'Apple TV',
  'apple tv+': 'Apple TV',
  'apple tv plus': 'Apple TV',
  'paramount': 'Paramount',
  'paramount network': 'Paramount',
  'paramount+': 'Paramount+',
  'paramount plus': 'Paramount+',
  'peacock': 'Peacock',
  'peacock tv': 'Peacock',
  'skyshowtime': 'SkyShowtime',

  // España
  'rtve': 'RTVE Play',
  'rtve play': 'RTVE Play',
  'la 1': 'RTVE Play',
  'la 2': 'RTVE Play',
  'tve': 'RTVE Play',
  'atresmedia': 'Atresmedia',
  'antena 3': 'Atresmedia',
  'atresplayer': 'Atresmedia',
  'atresplayer premium': 'Atresmedia',
  'mediaset': 'Mediaset',
  'telecinco': 'Mediaset',
  'cuatro': 'Mediaset',
  'mitele': 'Mediaset',
  'movistar plus+': 'Movistar Plus+',
  'movistar+': 'Movistar Plus+',
  'movistar plus': 'Movistar Plus+',
  'filmin': 'Filmin',
};

export function normalizePlatformOrNetwork(rawName?: string | null): string | null {
  if (!rawName) return null;
  const cleaned = rawName.trim();
  if (!cleaned) return null;

  const key = cleaned.toLowerCase();
  if (ALIAS_MAP[key]) return ALIAS_MAP[key];

  // Coincidencia parcial segura para variantes con país o sufijos
  for (const [aliasKey, canonical] of Object.entries(ALIAS_MAP)) {
    if (key.includes(aliasKey) && aliasKey.length >= 3) {
      return canonical;
    }
  }

  return cleaned;
}

export function normalizeList(values?: (string | null | undefined)[] | null): string[] {
  if (!Array.isArray(values)) return [];
  const result = new Set<string>();
  for (const item of values) {
    if (!item) continue;
    for (const part of item.split(',')) {
      const norm = normalizePlatformOrNetwork(part);
      if (norm) result.add(norm);
    }
  }
  return Array.from(result);
}