# Tuxly mascots

Nine poses of the same character, generated from the brand mark by
`scripts/build-mascots.py`. Same body curve, same eye positions, same amber
beak — the set reads as one penguin, not nine drawings.

Regenerate after editing the script:

```bash
python3 scripts/build-mascots.py
```

## The set

| Pose | Use it for |
|---|---|
| `wave` | greeting, hero, onboarding |
| `search` | empty search results |
| `read` | articles, guides |
| `code` | code samples, docs |
| `sleep` | no content yet, offline |
| `oops` | 404 and error pages |
| `cheer` | success, published |
| `think` | FAQ, help |
| `love` | thanks, sponsors, community |

## Two colour variants

| File | Background |
|---|---|
| `tuxly-<pose>.svg` | light — ink body |
| `tuxly-<pose>-light.svg` | dark — snow body |

Belly and eyes are holes, not painted shapes, so the background shows
through and the mascot sits on any surface of the right lightness. Only the
beak and the props carry colour.

## Using one

```astro
<img src="/brand/mascots/tuxly-oops-light.svg" alt="" width="160" />
```

Decorative use takes an empty `alt`. If the mascot is the only thing
carrying the message — an error page with no text — describe the meaning,
not the drawing: `alt="صفحه پیدا نشد"`, never `alt="پنگوئن"`.

Following the theme automatically:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/brand/mascots/tuxly-wave-light.svg">
  <img src="/brand/mascots/tuxly-wave.svg" alt="" width="160">
</picture>
```

## Rules

Same as the mark, on <https://tuxly.ir/brand>: do not stretch, rotate or
recolour the beak. Adding a new pose means editing the script, not tracing
over an export — that is what keeps the character consistent.
