# استقرار روی GitHub Pages

راهنمای استقرار سایت روی گیت‌هاب پیجز.

اگر خواستید از کدهای تاکسلی واسه خودتون استفاده کنید از اینجا می‌تونید کمک بگیرد.


---

## ۱. مخزن را بسازید و پوش کنید


```bash
cd tuxly
git init
git add .
git commit -m "feat: initial Tuxly site"
git branch -M master
git remote add origin https://github.com/goudarz/tuxly.git
git push -u origin master
```

## ۲. Pages را روی حالت Actions بگذارید

در گیت‌هاب: **Settings → Pages → Build and deployment → Source**

گزینه را روی **GitHub Actions** بگذارید — نه «Deploy from a branch».

این مهم است. حالت branch فقط فایل‌های خام مخزن را سرو می‌کند و پروژهٔ Astro
اصلاً بیلد نمی‌شود.

## ۳. اولین استقرار

با همان پوش مرحلهٔ ۱، ورک‌فلو `deploy.yml` خودکار اجرا می‌شود. در تب
**Actions** پیشرفتش را ببینید. حدود دو تا سه دقیقه طول می‌کشد.

اگر خطا خورد، تقریباً همیشه یکی از این دوتاست:

- `npm run check` شکسته — یعنی محتوایی اسکیما را نقض کرده. پیام خطا دقیقاً
  می‌گوید کدام فایل و کدام فیلد.
- Pages هنوز روی حالت Actions تنظیم نشده.

## ۴. دامنهٔ اختصاصی

فایل `public/CNAME` از قبل حاوی `tuxly.ir` است، پس گیت‌هاب دامنه را
خودکار تشخیص می‌دهد.

در پنل DNS دامنه‌تان این رکوردها را بسازید:

**برای دامنهٔ اصلی (`tuxly.ir`)** — چهار رکورد `A`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

و برای IPv6، چهار رکورد `AAAA`:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

**برای `www`** — یک رکورد `CNAME` به `goudarz.github.io`.

بعد در **Settings → Pages → Custom domain** بنویسید `tuxly.ir` و ذخیره کنید.
وقتی تأیید شد، تیک **Enforce HTTPS** را بزنید. صدور گواهی چند دقیقه تا
یک ساعت طول می‌کشد.

> نشانی‌های IP گیت‌هاب ممکن است تغییر کند. قبل از تنظیم، یک بار
> [مستندات رسمی Pages](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)
> را چک کنید.

## ۵. راز و متغیرها برای خط لولهٔ اخبار

**Settings → Secrets and variables → Actions**

در تب **Variables**:

| نام | مقدار | کار |
|---|---|---|
| `TUXLY_ENGINE` | `cloud` یا `mock` | موتور ترجمه در CI |
| `TUXLY_CLOUD_MODEL` | نام مدل | اختیاری |

در تب **Secrets**:

| نام | کار |
|---|---|
| `ANTHROPIC_API_KEY` | کلید API برای موتور ابری |

بدون این‌ها ورک‌فلوی `ingest.yml` روی حالت `mock` کار می‌کند و خروجی جعلی
می‌سازد — برای تست ساختار خوب است، برای انتشار نه.

## ۶. اجازهٔ ساخت PR توسط اکشن‌ها

ورک‌فلوهای `ingest.yml` و `update-versions.yml` باید بتوانند PR بسازند.

**Settings → Actions → General → Workflow permissions**

- **Read and write permissions** را انتخاب کنید
- تیک **Allow GitHub Actions to create and approve pull requests** را بزنید

## ۷. بعد از زنده شدن

سایت‌مپ را به سرچ کنسول گوگل معرفی کنید:

```
https://tuxly.ir/sitemap.xml
```

---

## یک هشدار مهم دربارهٔ GitHub Pages

**گیت‌هاب از داخل ایران گاهی در دسترس نیست.** اگر مخاطب اصلی‌تان داخل ایران
است، تکیه بر Pages به‌تنهایی ریسک دارد.

چون خروجی کاملاً ایستاست، همان پوشهٔ `dist` را می‌شود همزمان روی چند مقصد
گذاشت. یک الگوی عملی:

- **GitHub Pages** — مقصد بین‌المللی، رایگان
- **لیارا** یا **پارس‌پک** یا هر هاست ایرانی — آینهٔ داخلی

برای افزودن آینه، این مرحله را به `deploy.yml` اضافه کنید:

```yaml
      - name: Mirror to Iranian host
        run: |
          # مثال با rsync روی SSH
          rsync -az --delete dist/ \
            "${{ secrets.MIRROR_USER }}@${{ secrets.MIRROR_HOST }}:/var/www/tuxly/"
```

و `MIRROR_USER`، `MIRROR_HOST` و کلید SSH را در Secrets بگذارید.

> Cloudflare را به‌عنوان CDN پیشنهاد نمی‌کنم: از ژوئن ۲۰۲۵ دسترسی به آن از
> داخل ایران مسدود شده است.
