// Pure builder for the Pix "BR Code" (EMV® MPM / "Pix Copia e Cola") payload.
// Deterministic and dependency-free: assembles the EMV TLV fields and appends a
// CRC16-CCITT (FALSE) checksum, exactly as Banco Central's Pix spec requires.
// No network, no SDK — see docs/guides/REFERENTIAL_TRANSPARENCY.md.

const PIX_GUI = "br.gov.bcb.pix";

export interface PixBrCodeParams {
  /** The Pix key (chave aleatória / e-mail / phone / CPF·CNPJ). */
  key: string;
  /** Recipient name — EMV field 59, truncated to 25 ASCII chars. */
  merchantName: string;
  /** Recipient city — EMV field 60, truncated to 15 ASCII chars. */
  merchantCity: string;
  /** Optional fixed amount in BRL. Omitted → payer types the amount (open donation). */
  amount?: number;
  /** Optional reference label (txid). Defaults to "***" (no specific txid). */
  txid?: string;
}

/** One EMV TLV element: 2-char id + 2-digit length + value. */
function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

/** Strip accents and any non-printable-ASCII so the value is BR-Code-safe. */
function asciiSafe(value: string): string {
  // NFD splits accented letters into base + combining mark; stripping everything
  // outside printable ASCII then drops the marks (and any other non-ASCII).
  return value
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/**
 * CRC16-CCITT (FALSE): polynomial 0x1021, initial value 0xFFFF, no reflection.
 * Returns the 4-char uppercase hex checksum the Pix spec appends after "6304".
 */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Builds the full "Pix Copia e Cola" string for a static BR Code. The same string
 * is what gets encoded into the donation QR. Pure function of its inputs.
 */
export function buildPixBrCode(params: PixBrCodeParams): string {
  const name = asciiSafe(params.merchantName).slice(0, 25);
  const city = asciiSafe(params.merchantCity).slice(0, 15);
  const txid = asciiSafe(params.txid ?? "***").slice(0, 25) || "***";

  const merchantAccount = tlv("26", tlv("00", PIX_GUI) + tlv("01", params.key));
  const additionalData = tlv("62", tlv("05", txid));

  const body =
    tlv("00", "01") + // Payload Format Indicator
    merchantAccount + // 26 — Merchant Account Information (Pix)
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986") + // Transaction Currency (BRL)
    (params.amount != null ? tlv("54", params.amount.toFixed(2)) : "") +
    tlv("58", "BR") + // Country Code
    tlv("59", name) + // Merchant Name
    tlv("60", city) + // Merchant City
    additionalData; // 62 — Additional Data Field (txid)

  // The CRC (field 63, length 04) is computed over the body plus the "6304" header.
  const toCheck = `${body}6304`;
  return `${toCheck}${crc16(toCheck)}`;
}
