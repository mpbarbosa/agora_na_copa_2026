import type { AffiliateProduct } from "./types";

/**
 * Amazon Associates Brasil store/tracking tag. Links only earn commission when
 * this matches a real, registered Associates account — swap in your own tag.
 */
export const AMAZON_ASSOCIATES_TAG = "agoracopa-26";

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
    searchUrl: "https://www.amazon.com.br/s?k=smart+tv+4k+50+polegadas",
  },
  {
    id: "soundbar",
    title: "Soundbar",
    blurb: "Som de estádio dentro de casa.",
    icon: "soundbar",
    searchUrl: "https://www.amazon.com.br/s?k=soundbar",
  },
  {
    id: "camisa-brasil",
    title: "Camisa do Brasil",
    blurb: "Entre em campo com o time.",
    icon: "shirt",
    searchUrl: "https://www.amazon.com.br/s?k=camisa+sele%C3%A7%C3%A3o+brasileira",
  },
  {
    id: "petiscos",
    title: "Petiscos do jogo",
    blurb: "Pra aguentar os 90 minutos (e a prorrogação).",
    icon: "popcorn",
    searchUrl: "https://www.amazon.com.br/s?k=petiscos",
  },
  {
    id: "cooler",
    title: "Cooler térmico",
    blurb: "Bebida gelada do apito inicial ao final.",
    icon: "snowflake",
    searchUrl: "https://www.amazon.com.br/s?k=cooler+t%C3%A9rmico",
  },
];
