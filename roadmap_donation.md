# Roadmap — Donations via Pix (Brazil)

**Status:** ✅ Implemented (v0.0.36x). The "Doe via Pix" block ships in the footer
(compact) and Fan Zone (full card with QR). See "What shipped" below.

**Key-type decision (made):** the owner first offered a **CPF** as the key, but — per the
privacy warning below — chose to use a **`chave aleatória` (random key)** instead. The
CPF was **discarded** (never written to any file or git).

## What shipped

- `src/utils/pixBrCode.ts` — pure, dependency-free BR Code (EMV) builder + CRC16-CCITT.
  Unit-tested (`tests/pix-brcode.test.ts`) incl. the canonical CRC check vector.
- `src/config.ts` → `PIX_DONATION` { key, merchantName, merchantCity, label } +
  `isPixDonationConfigured()`. Key = the random EVP (no CPF).
- `src/components/DonationPix.tsx` — `compact` (footer) + `full` (Fan Zone, QR via
  `qrcode.react`) variants, copy-to-clipboard for key and "Pix Copia e Cola".
- Wired into `App.tsx` footer and `FanZoneView.tsx`. e2e: `tests/e2e/donation-pix.spec.ts`.

### ⚠️ Owner to confirm (cosmetic, in `src/config.ts`)
- **`merchantName`** defaulted to `MARCELO PEREIRA BARBOSA` (from git config). Change if
  the bank-registered name differs.
- **`merchantCity`** = `SAO PAULO` (confirmed by owner).

**Goal:** let visitors of *Agora na Copa 26* donate to support the project via **Pix**
(Brazil's instant payment), with a one-tap "Pix Copia e Cola" code and a QR.

---

## Why this is paused

The owner asked to "register bank account data to receive donations by Pix", but the
actual Pix key / recipient details were **not provided**. A wrong Pix key would route
donations to a stranger, so the implementation cannot proceed on guessed data.

---

## Data still needed (from the owner)

1. **Pix key — type + value.** One of:
   - `chave aleatória` (EVP) — e.g. `123e4567-e12b-12d1-a456-426655440000`
   - `e-mail` — e.g. `voce@exemplo.com`
   - `telefone` — e.g. `+5531999998888`
   - `CPF` / `CNPJ` (⚠️ see privacy warning)
2. **Nome do recebedor** — account holder name as registered. BR Code merchant-name
   field is limited to **~25 chars, ASCII** (strip accents).
3. **Cidade** — owner's city, BR Code merchant-city limited to **~15 chars** (e.g.
   `BELO HORIZONTE`).
4. *(optional)* short label/description, e.g. "Apoie o Agora na Copa 26".
5. *(optional)* default/suggested amount — donations are usually **open** (no fixed value).

---

## ⚠️ Privacy warning (must be acknowledged before implementing)

Whatever key is provided gets **committed to the public GitHub repo and served on the
live site** — and stays in git history permanently.

- A **receiving** Pix key is meant to be shared, so email / phone / random key are fine.
- **Do NOT use CPF/CNPJ as the public key** — it exposes the owner's CPF/CNPJ publicly
  and irreversibly.
- **Recommendation:** create a dedicated **`chave aleatória` (random key)** in the bank
  app (or use a throwaway email/phone) specifically for public donations.

---

## Decisions to confirm

- **Placement** (pick one):
  - **Global footer** (recommended) — present on every tab, low-key. Anchor:
    `App.tsx` `<footer>` (~line 385).
  - **Fan Zone** — a dedicated "Apoie o projeto" card in `FanZoneView.tsx`.
  - **Both.**

---

## Implementation plan (once data is in)

A self-contained "Doe via Pix" UI block:

1. **Display the key** (type + value) with a **copy button**.
2. **Pix Copia e Cola** — generate the static **BR Code (EMV)** payload string and a
   copy button. Fields needed: merchant key, merchant name (≤25), merchant city (≤15),
   optional amount, optional txid. Payload ends with a **CRC16-CCITT (0x1021, init
   0xFFFF)** checksum over the preceding data. This is deterministic and needs no
   network or paid SDK.
3. **QR code** — render the same BR Code string as a QR (a small client-side QR lib, or
   a pre-generated SVG/PNG if a dependency is undesirable).
4. **pt-BR copy** in the football-broadcast voice (see `CONTEXT.md`), theme-aware
   (`classic-light` / `stadium-dark` ternaries — no `dark:` utilities).
5. **No PII beyond the key** — show only what's necessary to pay.

### Notes / constraints
- New runtime deps (e.g. a QR generator) must go in `package.json` `dependencies` (not
  `devDependencies`) so `npm ci --omit=dev` works on the prod host, per project rules.
- Prefer a **zero-dependency** EMV builder (pure function, unit-testable per
  `REFERENTIAL_TRANSPARENCY.md`) over an external lib.
- Add an e2e (Playwright) asserting the block renders and the copy buttons expose the
  expected BR Code string.

### Existing context
- No donation/Pix code exists in the repo yet (greenfield).
- Monetization direction is already recorded: AdSense + non-gambling affiliates
  (memory: "Monetization & analytics plan"). Pix donations complement that lane.
- AdSense site verification is in progress (a `google-adsense-account` meta tag was
  added in v0.0.356).

---

## Open questions

- Single Pix key, or also a recurring option (e.g. a separate apoia.se / Buy-Me-a-Coffee
  link)? For now: **Pix only**, as requested.
- Show a suggested amount, or fully open? Default: **open**.

---

## Next step

Owner provides items 1–4 above **plus** the placement choice → implement the "Doe via
Pix" block (copy-to-clipboard BR Code + QR), test, and ship via `/test-bump-deploy`.
