---
name: Alpine Linux
nameFa: آلپاین
type: distribution
summary: کوچک، امن و ساده؛ تصویر پایهٔ اکثر کانتینرهای دنیا همین است.
website: https://alpinelinux.org
repo: https://gitlab.alpinelinux.org/alpine
docs: https://docs.alpinelinux.org
family: Independent
packageManager: apk
releaseModel: fixed
eolId: alpine
architectures: [x86_64]
tags: [توزیع]
currentVersion: '3.24.1'
releasedAt: 2026-06-13
eolAt: 2028-06-01
versionCheckedAt: 2026-08-17
---

آلپاین به‌جای glibc از musl و به‌جای coreutils از BusyBox استفاده می‌کند.
نتیجه‌اش تصویر پایه‌ای است حدود پنج مگابایت — به همین دلیل عملاً استاندارد
دنیای کانتینر شده است.

امنیت از ابتدا در طراحی‌اش بوده: کامپایل با محافظت در برابر سرریز بافر و
PaX/grsecurity در نسخه‌های قدیمی.

نکتهٔ مهم برای توسعه‌دهنده‌ها: چون musl به‌جای glibc است، بعضی باینری‌های
از پیش کامپایل‌شده روی آلپاین کار نمی‌کنند.
