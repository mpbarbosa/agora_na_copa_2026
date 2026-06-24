import assert from "node:assert/strict";
import test from "node:test";

import { buildPixBrCode, crc16 } from "../src/utils/pixBrCode";

test("crc16 matches the canonical CRC-16/CCITT-FALSE check vector", () => {
  // The standard check value for "123456789" is 0x29B1.
  assert.equal(crc16("123456789"), "29B1");
});

test("buildPixBrCode assembles a valid static Pix BR Code", () => {
  const key = "4a1248a0-93de-4f65-8e17-cf5ac4a147a9";
  const code = buildPixBrCode({
    key,
    merchantName: "MARCELO PEREIRA BARBOSA",
    merchantCity: "BRASIL",
    txid: "DOACAO",
  });

  // Payload Format Indicator + Pix GUI + the key (TLV-framed).
  assert.ok(code.startsWith("000201"));
  assert.ok(code.includes("0014br.gov.bcb.pix"));
  assert.ok(code.includes(`0136${key}`)); // id 01, length 36, the key
  // Fixed EMV fields: MCC, currency (BRL), country.
  assert.ok(code.includes("52040000"));
  assert.ok(code.includes("5303986"));
  assert.ok(code.includes("5802BR"));

  // Ends with field 63 ("6304" + 4-hex CRC) computed over everything before it.
  const body = code.slice(0, -4);
  assert.ok(body.endsWith("6304"));
  assert.equal(code.slice(-4), crc16(body));
});

test("buildPixBrCode truncates name/city and strips accents to ASCII", () => {
  const code = buildPixBrCode({
    key: "x",
    merchantName: "JOSÉ DA SILVA SANTOS DE OLIVEIRA", // > 25 chars, accented
    merchantCity: "SÃO JOÃO DEL REI MINAS", // > 15 chars, accented
  });

  // Field 59 (name): "59" + length 25 + the accent-stripped, truncated value.
  assert.ok(code.includes("5925JOSE DA SILVA SANTOS DE O"));
  // Field 60 (city): "60" + length 15 + the accent-stripped, truncated value.
  assert.ok(code.includes("6015SAO JOAO DEL RE"));
});
