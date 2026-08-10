---
name: Void Linux
nameFa: وید لینوکس
type: distribution
summary: توزیع مستقل با init جایگزین runit و سیستم بستهٔ خودش؛ سبک و بدون systemd.
website: https://voidlinux.org
repo: https://github.com/void-linux/void-packages
docs: https://docs.voidlinux.org
family: Independent
packageManager: xbps
releaseModel: rolling
defaultDesktop: [Xfce]
architectures: [x86_64]
tags: [توزیع]
---

وید از صفر نوشته شده و از هیچ توزیع دیگری مشتق نشده. سیستم مدیریت بستهٔ
XBPS و سیستم init به‌نام runit را خودش ساخته است.

برای کسانی که systemd را نمی‌خواهند، وید یکی از معدود گزینه‌های جدی و
فعال است. runit ساده‌تر و سبک‌تر است، هرچند امکانات systemd را ندارد.

دو نسخه دارد: یکی با glibc و یکی با musl. دومی برای سیستم‌های کمینه و
تعبیه‌شده مناسب است.
