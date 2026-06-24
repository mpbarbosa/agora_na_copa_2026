import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Coffee, Copy } from "lucide-react";
import { PIX_DONATION, isPixDonationConfigured } from "../config";
import { buildPixBrCode } from "../utils/pixBrCode";

interface DonationPixProps {
  theme: "classic-light" | "stadium-dark";
  /** "full" = Fan Zone card with QR; "compact" = single footer line. */
  variant: "full" | "compact";
}

/**
 * "Doe via Pix" — lets visitors support the project. Shows the Pix key with a copy
 * button and (full variant) a QR + "Pix Copia e Cola" string, both built from the
 * static BR Code (EMV) payload via buildPixBrCode. No network, no third party: the
 * QR is rendered locally from the same string the copy button exposes.
 */
export function DonationPix({ theme, variant }: DonationPixProps) {
  const isLight = theme === "classic-light";
  const [copied, setCopied] = useState<null | "key" | "brcode">(null);

  const brCode = useMemo(
    () =>
      buildPixBrCode({
        key: PIX_DONATION.key,
        merchantName: PIX_DONATION.merchantName,
        merchantCity: PIX_DONATION.merchantCity,
        txid: "DOACAO",
      }),
    [],
  );

  if (!isPixDonationConfigured()) return null;

  const copy = async (text: string, which: "key" | "brcode") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — the value is still visible to copy manually */
    }
  };

  const accent = isLight ? "text-[#009c3b]" : "text-[#00e476]";
  const mutedClasses = isLight ? "text-slate-500" : "text-slate-400";

  const copyBtnClass = isLight
    ? "border-slate-300 text-slate-700 hover:bg-slate-100"
    : "border-white/15 text-slate-200 hover:bg-white/10";

  // ---- Compact (footer) ---------------------------------------------------
  if (variant === "compact") {
    return (
      <div
        className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-xs"
        id="donation-pix-compact"
        data-testid="donation-pix-compact"
      >
        <span className={`inline-flex items-center gap-1 font-bold ${accent}`}>
          <Coffee size={12} aria-hidden="true" /> {PIX_DONATION.label}
        </span>
        <span className={mutedClasses}>·</span>
        <span className={mutedClasses}>Pix:</span>
        <code className={isLight ? "text-slate-700" : "text-slate-200"} data-testid="donation-pix-key">
          {PIX_DONATION.key}
        </code>
        <button
          type="button"
          onClick={() => copy(PIX_DONATION.key, "key")}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 uppercase tracking-wider transition ${copyBtnClass}`}
          aria-label="Copiar chave Pix"
          data-testid="donation-pix-copy-key"
        >
          {copied === "key" ? <Check size={11} /> : <Copy size={11} />}
          {copied === "key" ? "Copiado" : "Copiar"}
        </button>
      </div>
    );
  }

  // ---- Full (Fan Zone card) ----------------------------------------------
  const cardClasses = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#121414] border-white/10";
  const headingClasses = isLight ? "text-slate-900" : "text-white";

  return (
    <section
      className={`rounded-2xl border p-5 ${cardClasses}`}
      id="donation-pix"
      data-testid="donation-pix-full"
    >
      <h3 className={`font-anton text-lg uppercase tracking-wide ${headingClasses}`}>
        <span className="inline-flex items-center gap-2">
          <Coffee size={18} className={accent} aria-hidden="true" />
          {PIX_DONATION.label}
        </span>
      </h3>
      <p className={`mt-1 font-archivo text-sm ${mutedClasses}`}>
        Escaneie o QR no app do seu banco ou copie a chave Pix. Toda contribuição ajuda
        a manter o projeto no ar.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* QR — white quiet zone so it scans on either theme. */}
        <div className="shrink-0 rounded-xl bg-white p-3" data-testid="donation-pix-qr">
          <QRCodeSVG value={brCode} size={132} marginSize={0} level="M" />
        </div>

        <div className="w-full min-w-0 space-y-3">
          <div>
            <p className={`font-mono text-[10px] uppercase tracking-wider ${mutedClasses}`}>
              Chave Pix · {PIX_DONATION.keyTypeLabel}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code
                className={`min-w-0 flex-1 truncate font-mono text-xs ${headingClasses}`}
                title={PIX_DONATION.key}
              >
                {PIX_DONATION.key}
              </code>
              <button
                type="button"
                onClick={() => copy(PIX_DONATION.key, "key")}
                className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition ${copyBtnClass}`}
                data-testid="donation-pix-full-copy-key"
              >
                {copied === "key" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "key" ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => copy(brCode, "brcode")}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition ${copyBtnClass}`}
            data-testid="donation-pix-copy-brcode"
          >
            {copied === "brcode" ? <Check size={14} /> : <Copy size={14} />}
            {copied === "brcode" ? "Pix Copia e Cola copiado" : "Copiar Pix Copia e Cola"}
          </button>
        </div>
      </div>
    </section>
  );
}
