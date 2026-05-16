// pages/api/generate-docx.js
// Generates a downloadable Word document from the analysis text.
// Schweizer Hochdeutsch: alle ß → ss

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  PageBreak, BorderStyle, LevelFormat, Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx';

// Swiss German: replace all ß with ss everywhere
function ss(s) { return String(s || '').replace(/ß/g, 'ss'); }

// Remove structural marker tags so Word output is human-readable.
// These markers were designed for the HTML renderer in the frontend.
function stripMarkers(text) {
  let t = text;
  // Card grids — flatten to plain text lines
  t = t.replace(/\[(PERSON|KARTEN|ASTRO|HS|NAMEN)-GRID-START\]/g, '');
  t = t.replace(/\[(PERSON|KARTEN|ASTRO|HS|NAMEN)-GRID-END\]/g, '');
  // [PERSON-CARD:Label|Name|Datum|Sternzeichen|Beschreibung|LZ:11|Pinnacle:9|PersJahr:4]
  t = t.replace(/\[PERSON-CARD:([^\]]+)\]/g, (_, body) => {
    const parts = body.split('|');
    return `\n${parts[0] || ''}: ${parts[1] || ''}\n${parts[2] || ''}\n${parts[3] || ''}\n${parts[4] || ''}\n[${parts.slice(5).join(' · ')}]\n`;
  });
  // [KARTE:Eyebrow|Titel|Untertitel|Beschreibung]
  t = t.replace(/\[KARTE:([^\]]+)\]/g, (_, body) => {
    const [eyebrow, title, subtitle, desc] = body.split('|');
    return `\n${title || ''} — ${eyebrow || ''}\n${subtitle || ''}\n${desc || ''}\n`;
  });
  // [DYNAMIK:SIE-Label|SIE-Zahl|ER-Label|ER-Zahl|Resonanz]
  t = t.replace(/\[DYNAMIK:([^\]]+)\]/g, (_, body) => {
    const p = body.split('|');
    return `\n${p[0]} (${p[1]})  ↔  ${p[2]} (${p[3]})\n${p[4] || ''}\n`;
  });
  // [ASTRO:Symbol|Titel|Text]
  t = t.replace(/\[ASTRO:([^\]]+)\]/g, (_, body) => {
    const [sym, title, txt] = body.split('|');
    return `\n${sym} ${title}\n${txt || ''}\n`;
  });
  // [HERAUSFORDERUNG:Text] [SCHLUESSEL:Text]
  t = t.replace(/\[HERAUSFORDERUNG:([^\]]+)\]/g, (_, txt) => `\nHerausforderung: ${txt}\n`);
  t = t.replace(/\[SCHLUESSEL:([^\]]+)\]/g, (_, txt) => `\nSchluessel: ${txt}\n`);
  // [JAHRES-TABELLE:Name1|Name2]
  t = t.replace(/\[JAHRES-TABELLE:([^\]]+)\]/g, (_, names) => {
    return `\nJahresenergien (${names.split('|').join(', ')}):\n`;
  });
  // [JAHR:2025|5·Veränderung|...]
  t = t.replace(/\[JAHR:([^\]]+)\]/g, (_, body) => {
    const parts = body.split('|');
    return `  ${parts[0]} — ${parts.slice(1).join(' / ')}`;
  });
  // [PINNACLE:Person|Nr|Zeitraum|Zahl|Beschreibung|Challenge]
  t = t.replace(/\[PINNACLE:([^\]]+)\]/g, (_, body) => {
    const [person, nr, span, num, desc, challenge] = body.split('|');
    return `\n${person} — Pinnacle ${nr} (${span}): Zahl ${num}\n${desc || ''}\nHerausforderung: ${challenge || ''}\n`;
  });
  // [NAMEN-CARD:Name|Rolle|Seele|Label|Pers|Label|Ausdruck|Label|Beschreibung]
  t = t.replace(/\[NAMEN-CARD:([^\]]+)\]/g, (_, body) => {
    const p = body.split('|');
    return `\n${p[0]} — ${p[1]}\n  Seelendrang: ${p[2]} (${p[3]})  ·  Persoenlichkeit: ${p[4]} (${p[5]})  ·  Ausdruck: ${p[6]} (${p[7]})\n  ${p[8] || ''}\n`;
  });
  // [ZAHL:11] or [ZAHL:11/3]
  t = t.replace(/\[ZAHL:([^\]]+)\]/g, (_, num) => `\n  ⟨ ${num} ⟩\n`);
  // [ESSENZ:Text]
  t = t.replace(/\[ESSENZ:([^\]]+)\]/g, (_, txt) => `\n${txt}\n`);
  // Collapse 3+ blank lines
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

// Inline markdown: **bold** and *italic* → TextRun array
function parseInlineRuns(text, tx) {
  const runs = [];
  // Combined regex for **bold** and *italic*
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: tx(text.slice(last, m.index)), font: 'Georgia' }));
    const tok = m[0];
    if (tok.startsWith('**')) runs.push(new TextRun({ text: tx(tok.slice(2, -2)), bold: true, font: 'Georgia' }));
    else runs.push(new TextRun({ text: tx(tok.slice(1, -1)), italics: true, font: 'Georgia' }));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ text: tx(text.slice(last)), font: 'Georgia' }));
  return runs.length ? runs : [new TextRun({ text: tx(text), font: 'Georgia' })];
}

function bodyParagraphs(bodyText, tx) {
  const cleaned = stripMarkers(bodyText);
  const blocks = cleaned.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const out = [];
  for (const block of blocks) {
    // Multi-line block → one paragraph with line breaks
    const lines = block.split('\n');
    const children = [];
    lines.forEach((line, i) => {
      if (i > 0) children.push(new TextRun({ break: 1 }));
      children.push(...parseInlineRuns(line, tx));
    });
    out.push(new Paragraph({
      children,
      spacing: { before: 120, after: 120, line: 320 },
      alignment: AlignmentType.JUSTIFIED,
    }));
  }
  return out;
}

export const config = { maxDuration: 30 };

const LOCALE_LABELS = {
  de: {
    brand: 'herzbewegung · Familien-Code',
    title: 'Deine Seelenlandschaft',
    notes: '— Notizen —',
    footerName: 'Susana · Numerologie & Astrologie',
    locale: 'de-CH',
  },
  en: {
    brand: 'herzbewegung · Family Code',
    title: 'Your Soul Landscape',
    notes: '— Notes —',
    footerName: 'Susana · Numerology & Astrology',
    locale: 'en-GB',
  },
  pt: {
    brand: 'herzbewegung · Código Familiar',
    title: 'A Tua Paisagem da Alma',
    notes: '— Notas —',
    footerName: 'Susana · Numerologia & Astrologia',
    locale: 'pt-PT',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { rawText, name, language } = req.body || {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'Missing rawText' });
  }

  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const L = LOCALE_LABELS[lang];
  // Defensive style filters:
  // - ß → ss only for German
  // - Em-Dash (—) → comma, En-Dash (–) → hyphen (everywhere, all languages)
  const filterText = (s) => {
    let t = String(s || '');
    if (lang === 'de') t = t.replace(/ß/g, 'ss');
    t = t.replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, '-');
    return t;
  };

  const displayName = filterText(name || (lang === 'en' ? 'Your Analysis' : lang === 'pt' ? 'A Tua Análise' : 'Deine Analyse'));

  // Split sections by ~~~
  const sections = rawText.split('~~~').map(s => s.trim()).filter(Boolean);

  // Build document children
  const children = [];

  // Title page
  children.push(new Paragraph({
    spacing: { before: 1200, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: filterText(L.brand), font: 'Georgia', size: 22, color: '8B4060' })],
  }));
  children.push(new Paragraph({
    spacing: { before: 240, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: filterText(L.title), font: 'Playfair Display', size: 56, color: '1C1714' })],
  }));
  children.push(new Paragraph({
    spacing: { before: 120, after: 120 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: displayName, font: 'Georgia', size: 32, italics: true, color: '5A4A40' })],
  }));
  children.push(new Paragraph({
    spacing: { before: 720 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: filterText(new Date().toLocaleDateString(L.locale, { day: '2-digit', month: 'long', year: 'numeric' })), font: 'Georgia', size: 20, color: '9A8A80' })],
  }));
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Sections
  sections.forEach((sec, idx) => {
    const lines = sec.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const bodyText = lines.slice(1).join('\n').trim();

    // Section title — H2 style
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 240 },
      children: [new TextRun({ text: filterText(title), font: 'Playfair Display', size: 36, color: '8B4060' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C4962A', space: 8 } },
    }));

    // Body paragraphs
    bodyParagraphs(bodyText, filterText).forEach(p => children.push(p));

    // Note line (a few empty lines for handwritten notes)
    children.push(new Paragraph({
      spacing: { before: 360, after: 60 },
      children: [new TextRun({ text: L.notes, font: 'Georgia', size: 16, italics: true, color: '9A8A80' })],
    }));
    for (let i = 0; i < 4; i++) {
      children.push(new Paragraph({
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.DOTTED, size: 4, color: 'C4962A', space: 1 } },
        children: [new TextRun({ text: '' })],
      }));
    }

    // Ornament between sections (not after last)
    if (idx < sections.length - 1) {
      children.push(new Paragraph({
        spacing: { before: 240, after: 240 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '✦ ✦ ✦', font: 'Georgia', size: 20, color: 'C4962A' })],
      }));
    }
  });

  // Footer page: branding
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(new Paragraph({
    spacing: { before: 720, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'herzbewegung', font: 'Playfair Display', size: 32, color: '8B4060' })],
  }));
  children.push(new Paragraph({
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: L.footerName, font: 'Georgia', size: 20, color: '5A4A40', italics: true })],
  }));
  children.push(new Paragraph({
    spacing: { before: 60, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'herzbewegung.ch', font: 'Georgia', size: 18, color: '9A8A80' })],
  }));

  const doc = new Document({
    creator: 'herzbewegung — Familien-Code',
    title: `Familien-Code · ${displayName}`,
    styles: {
      default: { document: { run: { font: 'Georgia', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 (DXA)
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  try {
    const buffer = await Packer.toBuffer(doc);
    const safeName = displayName.replace(/[^a-zA-Z0-9_\- ]+/g, '').replace(/\s+/g, '_') || 'Analyse';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Familien-Code_${safeName}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('DOCX generation error:', err);
    return res.status(500).json({ error: err.message || 'DOCX generation failed' });
  }
}
