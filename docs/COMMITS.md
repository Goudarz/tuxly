# قرارداد پیام کامیت

قالب [Conventional Commits](https://www.conventionalcommits.org) با چند نوع
اضافه که مخصوص این پروژه است.

**پیام کامیت انگلیسی نوشته می‌شود**، حتی وقتی محتوای فارسی اضافه می‌کنید —
تا تاریخچهٔ گیت برای هر مشارکت‌کننده‌ای خوانا بماند.

---

## قالب

```
<type>(<scope>): <subject>

<body>

<footer>
```

فقط خط اول اجباری است.

- **subject** با فعل امری، حرف کوچک، بدون نقطهٔ پایان، زیر ۷۲ کاراکتر
- **body** اختیاری؛ *چرا*ی تغییر را بگوید. (diff خودش می‌گوید)

## انواع

| نوع | کِی |
|---|---|
| `feat` | قابلیت تازه |
| `fix` | رفع اشکال |
| `content` | مطلب، رویداد، موجودیت یا واژه‌نامه — تغییر در `content/` |
| `style` | CSS، چیدمان، تایپوگرافی — بدون تغییر منطق |
| `a11y` | دسترسی‌پذیری |
| `seo` | متادیتا، schema، سایت‌مپ، robots |
| `perf` | کارایی |
| `refactor` | بازنویسی بدون تغییر رفتار |
| `docs` | مستندات — README، راهنماها، کامنت‌ها |
| `build` | وابستگی‌ها، پیکربندی بیلد، `package.json` |
| `ci` | ورک‌فلوهای گیت‌هاب |
| `chore` | نگهداری، به‌روزرسانی خودکار داده |
| `revert` | بازگرداندن کامیت قبلی |

## حوزه‌ها (scope)

اختیاری ولی توصیه‌شده. حوزه‌های رایج این پروژه:

```
search   header   footer   gallery   media   events   feed
brand    schema   distro   desktop   wm      project  community
author   glossary pipeline versions  a11y    rtl
```

## نمونه‌ها

```
feat(search): show live results in a dialog instead of a page jump
fix(rtl): stop bidi from reordering version numbers inside sentences
content(distro): add 30 Linux distributions with Persian descriptions
content: publish GNOME 48 release note
style(cards): reveal version on hover with an amber slide-up
a11y(gallery): announce external links and trap focus in the lightbox
seo(sitemap): publish at /sitemap.xml alongside sitemap-1.xml
perf(fonts): self-host Vazirmatn and preload the woff2
build(deps): bump sharp to 0.35.3
ci(pages): deploy with actions/deploy-pages instead of a branch
chore(versions): refresh from Wikidata and endoflife.date
docs(readme): explain why versions are not entered by hand
```

## تغییر شکنند

علامت `!` بعد از scope، و توضیح در فوتر:

```
refactor(content)!: rename translationStatus to originStatus

BREAKING CHANGE: every post frontmatter must be updated. The old field
name now fails schema validation at build time.
```

## کامیت‌های خودکار

ورک‌فلوها از این دو استفاده می‌کنند — دستی ننویسیدشان:

```
chore(versions): refresh from Wikidata and endoflife.date
content(ingest): add drafts pending review
```

## چند قاعدهٔ عملی

**یک کامیت، یک تغییر منطقی.** اضافه کردن ده مطلب که می‌شود یک پست در یک کامیت مشکلی ندارد ولی اضافه کردن چندین پست در یک کامیت مناسب نیست. 

**محتوا و کد را قاطی نکنید.** `content:` و `feat:` در دو کامیت جدا. اگر
روزی مجبور شوید کد را revert کنید، نمی‌خواهید مطالب هم برگردند.

**پیام باید بدون دیدن diff معنا بدهد.** `fix: bug` بی‌فایده است.
`fix(feed): escape ampersands in post titles` مفید است.
