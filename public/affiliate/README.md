# public/affiliate/ — affiliate card images

Drop the licensed **generic category photos** for the "Equipe para assistir à
Copa" strip (`src/components/AffiliateProducts.tsx`) here. They are served at
`/affiliate/<file>` and wired per product via `AffiliateProduct.imageUrl` in
`src/config.ts`.

## Hard rule: NOT Amazon product images

These must be **your own or stock-licensed GENERIC photos** (a generic 4K TV, a
soundbar, a Brazil-style jersey, snacks, a cooler) — **never** an Amazon product
image. Amazon's images are licensed only via the (sales-gated, mid-retirement)
product-advertising API and may not be stored. See the memory note
`reference_amazon_affiliate_image_terms`.

## Expected files (match these to the config below)

| Product `id` | Suggested file | Subject |
|---|---|---|
| `smart-tv` | `smart-tv.jpg` | Generic 4K smart TV |
| `soundbar` | `soundbar.jpg` | Generic soundbar |
| `camisa-brasil` | `camisa-brasil.jpg` | Generic green-and-yellow football jersey |
| `petiscos` | `petiscos.jpg` | Snacks / finger food |
| `cooler` | `cooler.jpg` | Cooler / ice box with drinks |

Use square-ish images (the card renders them `object-contain` in an `h-20` box),
optimized (≤~80 KB each, JPG/WebP). Until a file exists the card automatically
falls back to its lucide icon, so partial coverage is fine.

## Wiring (after dropping a file)

Add `imageUrl` (and optionally `imageAlt`) to the matching entry in
`AFFILIATE_PRODUCTS` (`src/config.ts`), e.g.:

```ts
{
  id: "smart-tv",
  title: "Smart TV 4K",
  blurb: "Tela grande pra não perder nenhum lance.",
  icon: "tv",
  imageUrl: "/affiliate/smart-tv.jpg",
  imageAlt: "Smart TV 4K",
  searchUrl: "https://www.amazon.com.br/s?k=smart+tv+4k+50+polegadas",
},
```

If a stock-licensed image requires attribution, record the source + license here.

## Current images (sources)

All from Pexels under the [Pexels License](https://www.pexels.com/license/) (free
for commercial use, modification allowed, no attribution required). Downloaded
2026-06-27, resized via the Pexels CDN (`?auto=compress&cs=tinysrgb&w=500`).

| File | Pexels source |
|---|---|
| `smart-tv.jpg` | https://www.pexels.com/photo/black-flat-screen-tv-hanging-on-the-white-wall-5202925/ |
| `soundbar.jpg` | https://www.pexels.com/photo/close-up-photography-of-speaker-1034651 |
| `camisa-brasil.jpg` | https://www.pexels.com/photo/close-up-of-brazil-soccer-jersey-emblem-36572129/ |
| `petiscos.jpg` | https://www.pexels.com/photo/bowl-of-potato-chips-beside-a-drink-13427809/ |
| `cooler.jpg` | https://www.pexels.com/photo/high-angle-shot-of-a-person-getting-water-bottle-in-a-cool-box-8980722/ |

Note: `camisa-brasil.jpg` shows the CBF crest + a Nike swoosh; the Pexels License
covers the photo, not those trademarks. Swap to a brand-neutral jersey if that
exposure is unwanted.

