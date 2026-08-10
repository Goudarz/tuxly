---
name: NixOS
nameFa: نیکس‌او‌اس
type: distribution
summary: کل سیستم را در یک فایل پیکربندی توصیف می‌کنید؛ قابل بازتولید، اتمیک و قابل بازگشت.
website: https://nixos.org
repo: https://github.com/NixOS/nixpkgs
docs: https://nixos.org/manual/nixos/stable/
family: Independent
packageManager: nix
releaseModel: fixed
eolId: nixos
defaultDesktop: [GNOME, KDE Plasma]
architectures: [x86_64]
tags: [توزیع]
---

نیکس‌او‌اس با هر توزیع دیگری تفاوت بنیادی دارد. به‌جای نصب بسته‌ها، کل
سیستم را در فایل configuration.nix توصیف می‌کنید و نیکس آن را می‌سازد.

نتیجه‌اش این است که می‌توانید همان سیستم را روی صد ماشین دیگر عیناً
بازتولید کنید، به‌روزرسانی‌ها اتمیک‌اند، و اگر چیزی خراب شد از منوی بوت
به نسل قبلی برمی‌گردید.

منحنی یادگیری‌اش تند است — زبان Nix خودش یک زبان برنامه‌نویسی کارکردی
است. ولی اگر زیرساخت مدیریت می‌کنید، سرمایه‌گذاری روی آن معمولاً جواب
می‌دهد.
