import type { AffiliateProduct } from "./types";

/**
 * Amazon Associates Brasil store/tracking tag. Links only earn commission when
 * this matches a real, registered Associates account — swap in your own tag.
 */
export const AMAZON_ASSOCIATES_TAG = "agoracopa-20";

/** Append the Associates tag to an Amazon URL, preserving any existing query params. */
export function withAffiliateTag(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}tag=${AMAZON_ASSOCIATES_TAG}`;
}

/**
 * Curated "gear to watch the Cup with". v1 uses tagged category SEARCH links
 * (not fixed ASINs) so links never go dead and need no upkeep — Amazon still
 * attributes any purchase in the session to the tag.
 */
export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    id: "smart-tv",
    title: "Smart TV 4K",
    blurb: "Tela grande pra não perder nenhum lance.",
    icon: "tv",
    imageUrl: "/affiliate/smart-tv.jpg",
    imageAlt: "Smart TV 4K",
    searchUrl: "https://www.amazon.com.br/s?k=smart+tv+4k+50+polegadas",
  },
  {
    id: "soundbar",
    title: "Soundbar",
    blurb: "Som de estádio dentro de casa.",
    icon: "soundbar",
    imageUrl: "/affiliate/soundbar.jpg",
    imageAlt: "Soundbar para a TV",
    searchUrl: "https://www.amazon.com.br/s?k=soundbar",
  },
  {
    id: "camisa-brasil",
    title: "Camisa do Brasil",
    blurb: "Entre em campo com o time.",
    icon: "shirt",
    imageUrl: "/affiliate/camisa-brasil.jpg",
    imageAlt: "Camisa da seleção brasileira",
    searchUrl: "https://www.amazon.com.br/s?k=camisa+sele%C3%A7%C3%A3o+brasileira",
  },
  {
    id: "petiscos",
    title: "Petiscos do jogo",
    blurb: "Pra aguentar os 90 minutos (e a prorrogação).",
    icon: "popcorn",
    imageUrl: "/affiliate/petiscos.jpg",
    imageAlt: "Petiscos para assistir ao jogo",
    searchUrl: "https://www.amazon.com.br/s?k=petiscos",
  },
  {
    id: "cooler",
    title: "Cooler térmico",
    blurb: "Bebida gelada do apito inicial ao final.",
    icon: "snowflake",
    imageUrl: "/affiliate/cooler.jpg",
    imageAlt: "Cooler térmico com bebidas geladas",
    searchUrl: "https://www.amazon.com.br/s?k=cooler+t%C3%A9rmico",
  },
];

/**
 * Google AdSense publisher id (format "ca-pub-XXXXXXXXXXXXXXXX"). Until a real id
 * replaces the placeholder, AdSense stays DORMANT — no script loads and no ad
 * slots render (see isAdSenseConfigured). When you get approved, set this AND the
 * matching "pub-..." line in public/ads.txt, plus the ad-unit id below.
 */
export const ADSENSE_PUBLISHER_ID: string = "ca-pub-9509229216258895";

/**
 * AdSense ad-unit (slot) id. Create a "Display" ad unit in the AdSense dashboard
 * after approval and paste its 10-digit data-ad-slot here. Placeholder = dormant.
 */
export const ADSENSE_AD_SLOT: string = "0000000000";

/**
 * True only once BOTH a real publisher id AND a real ad-unit (slot) id are set.
 * Until then the AdSlot renders nothing (avoids requesting a non-existent slot).
 */
export function isAdSenseConfigured(): boolean {
  return (
    /^ca-pub-\d{16}$/.test(ADSENSE_PUBLISHER_ID) &&
    ADSENSE_PUBLISHER_ID !== "ca-pub-0000000000000000" &&
    /^\d{10}$/.test(ADSENSE_AD_SLOT) &&
    ADSENSE_AD_SLOT !== "0000000000"
  );
}

/**
 * Google Analytics 4 measurement id (format "G-XXXXXXXXXX"). Until a real id
 * replaces the placeholder, analytics stays DORMANT — no gtag.js loads and no
 * events fire (see isAnalyticsConfigured). Create a GA4 property → Web data
 * stream to get the id.
 */
export const GA4_MEASUREMENT_ID: string = "G-53CP8JNP5R";

/** True only once a real (non-placeholder) GA4 measurement id is configured. */
export function isAnalyticsConfigured(): boolean {
  return /^G-[A-Z0-9]{6,}$/.test(GA4_MEASUREMENT_ID) && GA4_MEASUREMENT_ID !== "G-XXXXXXXXXX";
}

/** Canonical public URL, used for share links (matches the OG canonical). */
export const SITE_URL = "https://copa2026.mpbarbosa.com";

/**
 * Pix donation details, rendered by the "Doe via Pix" block (footer + Fan Zone).
 *
 * `key` is a Pix *chave aleatória* (random EVP) on purpose — never a CPF/CNPJ, so
 * no personal document is exposed in this public repo. `merchantName`/`merchantCity`
 * feed the BR Code (EMV) "Pix Copia e Cola" payload: ASCII only, ≤25 and ≤15 chars
 * (longer values are truncated by buildPixBrCode). The city is informational (it
 * does not affect routing); update it to the recipient's real city when known.
 */
export const PIX_DONATION = {
  key: "4a1248a0-93de-4f65-8e17-cf5ac4a147a9",
  keyTypeLabel: "Chave aleatória",
  merchantName: "MARCELO PEREIRA BARBOSA",
  merchantCity: "SAO PAULO",
  /** Short call-to-action shown above the key. */
  label: "Apoie o Agora na Copa 26",
} as const;

/** True only when a real (non-placeholder) Pix key is configured. */
export function isPixDonationConfigured(): boolean {
  const key = PIX_DONATION.key.trim();
  return key.length > 0 && key !== "00000000-0000-0000-0000-000000000000";
}
