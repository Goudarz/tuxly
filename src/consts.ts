import pkg from '../package.json' with { type: 'json' };

export const SITE = {
  url: 'https://tuxly.ir',
  name: 'تاکسلی',
  nameLatin: 'tuxly',
  lang: 'fa-IR',
  tagline: 'دنیای نرم‌افزار آزاد، به فارسی',
  description:
    'تاکسلی خانهٔ فارسی نرم‌افزار آزاد و متن‌باز است: اخبار روز، معرفی توزیع‌ها و ' +
    'میزکارها، آموزش، و تقویم رویدادهای اجتماع متن‌باز.',
  email: 'hi@tuxly.ir',
  repo: 'https://github.com/goudarz/tuxly',
  postsPerPage: 12,
  version: pkg.version,
} as const;

/** Placeholders — replace these handles with the real accounts. */
export const SOCIAL = [
  { id: 'telegram', label: 'تلگرام', href: 'https://t.me/tuxlyir', handle: '@tuxlyir' },
  { id: 'mastodon', label: 'ماستودون', href: '#', handle: '@tuxly' },
  { id: 'github', label: 'گیت‌هاب', href: 'https://github.com/goudarz/tuxly', handle: 'goudarz/tuxly' },
  { id: 'peertube', label: 'پیرتیوب', href: '#', handle: '@tuxly' },
  { id: 'linkedin', label: 'لینکدین', href: 'https://www.linkedin.com/company/tuxly', handle: 'tuxly' },
  { id: 'x', label: 'ایکس', href: 'https://x.com/tuxlyir', handle: '@tuxlyir' },
  { id: 'rss', label: 'خوراک RSS', href: '/rss.xml', handle: 'rss.xml' },
] as const;

export const POST_TYPES = ['news', 'article', 'guide', 'review', 'weekly'] as const;

export const POST_TYPE_LABELS: Record<(typeof POST_TYPES)[number], string> = {
  news: 'خبر',
  article: 'مقاله',
  guide: 'آموزش',
  review: 'بررسی',
  weekly: 'هفته در متن‌باز',
};

export const ENTITY_TYPES = [
  'distribution',
  'desktop',
  'windowmanager',
  'project',
  'person',
  'community',
  'company',
  'organization',
  'license',
  'hardware',
] as const;

export const ENTITY_LABELS: Record<(typeof ENTITY_TYPES)[number], string> = {
  distribution: 'توزیع',
  desktop: 'میزکار',
  windowmanager: 'پنجره‌گردان',
  project: 'پروژه',
  person: 'شخص',
  community: 'اجتماع',
  company: 'شرکت',
  organization: 'سازمان',
  license: 'پروانه',
  hardware: 'سخت‌افزار',
};

export const ENTITY_ROUTES: Record<(typeof ENTITY_TYPES)[number], string> = {
  distribution: 'distributions',
  desktop: 'desktops',
  windowmanager: 'window-managers',
  project: 'projects',
  person: 'people',
  community: 'communities',
  company: 'companies',
  organization: 'organizations',
  license: 'licenses',
  hardware: 'hardware',
};

export const PACKAGE_MANAGERS = [
  'apt', 'dnf', 'pacman', 'zypper', 'apk', 'xbps', 'emerge', 'nix', 'eopkg', 'slackpkg',
] as const;
