export interface NoteSection {
  label: string;
  body: string;
}

// Parses an editorial note into labeled sections. A note may be a single
// paragraph (rendered under `defaultLabel`) or several "## Section" blocks, each
// becoming its own labeled section. Used by player cards (worldCupNote) and the
// match page (match analysis).
export function parseNoteSections(note: string, defaultLabel = "Leitura"): NoteSection[] {
  const trimmed = note.trim();
  if (!trimmed.includes("## ")) return [{ label: defaultLabel, body: trimmed }];

  const sections: NoteSection[] = [];
  let current: { label: string; body: string[] } | null = null;
  for (const line of trimmed.split("\n")) {
    const header = line.match(/^##\s+(.+)$/);
    if (header) {
      if (current) sections.push({ label: current.label, body: current.body.join(" ").trim() });
      current = { label: header[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line.trim());
    }
  }
  if (current) sections.push({ label: current.label, body: current.body.join(" ").trim() });
  return sections.filter((s) => s.body);
}
