import Head from 'next/head'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // ── STATE ──────────────────────────────────────────────────────
    const state = {
      constellation: '',
      focus: '',
      childCount: 1,
      lead: { name: '', email: '' },  // Lead-Gate
    };

    // ── FLOW ───────────────────────────────────────────────────────
    function getFlow() {
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      const hasKids = state.constellation === 'family' || state.constellation === 'solo_children';
      let f = ['splash', 'lead', 'constellation', 'person1'];
      if (hasPair) f.push('person2', 'couple');
      if (hasKids) f.push('children');
      f.push('focus', 'loading', 'result');
      return f;
    }

    let cur = 'splash';

    function showScreen(id) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      const el = document.getElementById('screen-' + id);
      if (!el) return;
      el.classList.add('active');
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = '';
      cur = id;
      window.scrollTo(0, 0);
      updateNav();
    }

    function updateNav() {
      const flow = getFlow();
      const idx = flow.indexOf(cur);
      const prog = document.getElementById('nav-progress');
      const steps = flow.filter(s => !['splash', 'lead', 'loading', 'result'].includes(s));
      if (['splash', 'lead', 'loading', 'result'].includes(cur)) {
        prog.innerHTML = '';
      } else {
        prog.innerHTML = steps.map((s) => {
          const si = flow.indexOf(s);
          let cls = 'nav-step';
          if (si < idx) cls += ' done';
          else if (si === idx) cls += ' active';
          return `<div class="${cls}"></div>`;
        }).join('');
      }
      const resetBtn = document.getElementById('nav-reset');
      if (resetBtn) resetBtn.style.display = (cur !== 'splash' && cur !== 'lead') ? '' : 'none';
    }

    function goNext() {
      const f = getFlow(), i = f.indexOf(cur);
      if (i < f.length - 1) showScreen(f[i + 1]);
    }

    function goBack() {
      const f = getFlow(), i = f.indexOf(cur);
      if (i > 0) showScreen(f[i - 1]);
    }

    // ── CARDS ──────────────────────────────────────────────────────
    function selectCard(el, type) {
      el.closest('[class*="card-grid"]').querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      if (type === 'constellation') {
        state.constellation = el.dataset.value;
        const btn = document.getElementById('btn-constellation-next');
        if (btn) btn.disabled = false;
      } else if (type === 'focus') {
        state.focus = el.dataset.value;
        const btn = document.getElementById('btn-focus-next');
        if (btn) btn.disabled = false;
      }
    }

    // ── LEAD GATE ──────────────────────────────────────────────────
    function validateLead() {
      const name = document.getElementById('lead-name')?.value.trim();
      const email = document.getElementById('lead-email')?.value.trim();
      const btn = document.getElementById('btn-lead-next');
      if (!btn) return;
      const valid = name && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      btn.disabled = !valid;
    }

    function submitLead() {
      const name = document.getElementById('lead-name')?.value.trim();
      const email = document.getElementById('lead-email')?.value.trim();
      if (!name || !email) return;
      state.lead = { name, email };

      // EmailJS — fire and forget
      try {
        if (window.emailjs && process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID) {
          window.emailjs.send(
            process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID,
            process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID,
            {
              to_email: 'info@herzbewegung.ch',
              user_name: name,
              user_email: email,
              timestamp: new Date().toLocaleString('de-CH'),
            }
          ).catch(() => {});
        }
      } catch {}

      goNext();
    }

    // ── COMPATIBILITY NUMBER ────────────────────────────────────────
    function compatNum(lz1, lz2) {
      if (!lz1 || !lz2 || lz1 === 'n/a' || lz2 === 'n/a') return 'n/a';
      const sum = Number(lz1) + Number(lz2);
      return red(sum);
    }

    // ── NAME CHANGE ANALYSIS ────────────────────────────────────────
    function nameChangeBlock(prefix, label) {
      const firstName = val(`${prefix}-newname-first`);
      const lastName = val(`${prefix}-newname-last`);
      if (!firstName && !lastName) return '';
      const full = `${firstName} ${lastName}`.trim();
      const n = nameNums(full);
      return `\n${label} — NEUER NAME: ${full}\n- Neue Ausdruckszahl: ${n.expression}\n- Neue Persönlichkeitszahl: ${n.personality}\n- Neue Seelendrang-Zahl: ${n.soul}`;
    }
    function toggleField(inputId, toggleId) {
      const input = document.getElementById(inputId);
      const box = document.getElementById(toggleId);
      if (!input || !box) return;
      const on = box.classList.toggle('on');
      input.disabled = on;
      if (on) input.value = '';
    }

    // ── FORMS ──────────────────────────────────────────────────────
    function personFormHTML(prefix) {
      return `
        <div class="field-row">
          <div class="field-group">
            <label class="field-label">Vorname/n (Taufname)</label>
            <input class="field-input" id="${prefix}-firstname" placeholder="Taufname/n" />
          </div>
          <div class="field-group">
            <label class="field-label">Nachname</label>
            <input class="field-input" id="${prefix}-lastname" placeholder="Nachname" />
          </div>
        </div>
        <div class="field-row-3">
          <div class="field-group">
            <label class="field-label">Geburtsdatum (TT.MM.JJJJ)</label>
            <input class="field-input" id="${prefix}-birthdate" placeholder="15.03.1988" />
          </div>
          <div class="field-group">
            <label class="field-label">Geburtszeit (HH:MM)</label>
            <input class="field-input" id="${prefix}-birthtime" placeholder="14:30" />
            <div class="toggle-row" data-toggle-input="${prefix}-birthtime" data-toggle-id="${prefix}-notime">
              <div class="toggle-box" id="${prefix}-notime"></div>
              <span class="toggle-label">Unbekannt</span>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Geburtsort</label>
            <input class="field-input" id="${prefix}-birthplace" placeholder="Stadt, Land" />
          </div>
        </div>`;
    }

    function childBlockHTML(i) {
      const p = `child${i}`;
      return `
        <div class="child-block" id="child-block-${i}">
          <div class="child-block-header">
            <div class="child-block-title">Kind ${i + 1}</div>
            ${i > 0 ? `<button class="btn-remove" data-remove-child="${i}">×</button>` : ''}
          </div>
          <div class="field-row">
            <div class="field-group">
              <label class="field-label">Vorname/n (Taufname)</label>
              <input class="field-input" id="${p}-firstname" placeholder="Taufname/n" />
            </div>
            <div class="field-group">
              <label class="field-label">Nachname</label>
              <input class="field-input" id="${p}-lastname" placeholder="Nachname" />
            </div>
          </div>
          <div class="field-row-3">
            <div class="field-group">
              <label class="field-label">Geburtsdatum (TT.MM.JJJJ)</label>
              <input class="field-input" id="${p}-birthdate" placeholder="15.03.2015" />
            </div>
            <div class="field-group">
              <label class="field-label">Geburtszeit (HH:MM)</label>
              <input class="field-input" id="${p}-birthtime" placeholder="14:30" />
              <div class="toggle-row" data-toggle-input="${p}-birthtime" data-toggle-id="${p}-notime">
                <div class="toggle-box" id="${p}-notime"></div>
                <span class="toggle-label">Unbekannt</span>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Geburtsort</label>
              <input class="field-input" id="${p}-birthplace" placeholder="Stadt, Land" />
            </div>
          </div>
        </div>`;
    }

    function addChild() {
      if (state.childCount >= 5) return;
      const container = document.getElementById('children-container');
      if (container) {
        container.insertAdjacentHTML('beforeend', childBlockHTML(state.childCount));
      }
      state.childCount++;
      const btn = document.getElementById('btn-add-child');
      if (btn) btn.style.display = state.childCount >= 5 ? 'none' : '';
    }

    function removeChild(i) {
      const block = document.getElementById('child-block-' + i);
      if (block) block.remove();
      state.childCount = Math.max(1, state.childCount - 1);
      const btn = document.getElementById('btn-add-child');
      if (btn) btn.style.display = '';
    }

    // ── HELPERS ────────────────────────────────────────────────────
    function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function isOn(id) { const el = document.getElementById(id); return el ? el.classList.contains('on') : false; }
    function getPerson(prefix) {
      return {
        firstName: val(`${prefix}-firstname`),
        lastName: val(`${prefix}-lastname`),
        birthDate: val(`${prefix}-birthdate`),
        birthTime: isOn(`${prefix}-notime`) ? 'unbekannt' : (val(`${prefix}-birthtime`) || 'unbekannt'),
        birthPlace: val(`${prefix}-birthplace`)
      };
    }
    function getChildren() {
      const out = [];
      for (let i = 0; i < state.childCount; i++) {
        if (document.getElementById(`child-block-${i}`)) out.push(getPerson(`child${i}`));
      }
      return out;
    }

    // ── NUMEROLOGIE ────────────────────────────────────────────────
    const LM = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9, J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9, S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8 };
    const VO = new Set(['A', 'E', 'I', 'O', 'U']);
    function red(n) { if (n === 11 || n === 22 || n === 33) return n; if (n < 10) return n; return red(String(n).split('').reduce((a, d) => a + parseInt(d), 0)); }
    function lifeNum(d) { if (!d) return 'n/a'; const dg = d.replace(/\D/g, ''); if (!dg) return 'n/a'; return red(dg.split('').reduce((a, c) => a + parseInt(c), 0)); }
    function nameNums(full) { const c = full.toUpperCase().replace(/[^A-Z]/g, ''); let s = 0, p = 0, e = 0; for (const ch of c) { const v = LM[ch] || 0; e += v; if (VO.has(ch)) s += v; else p += v; } return { soul: red(s) || 'n/a', personality: red(p) || 'n/a', expression: red(e) || 'n/a' }; }
    function persYear(d) { if (!d) return 'n/a'; const pt = d.split('.'); if (pt.length < 2) return 'n/a'; return red(parseInt(pt[0]) + parseInt(pt[1]) + 9); }
    function zodiac(d) {
      if (!d) return 'unbekannt';
      const pt = d.split('.'); if (pt.length < 2) return 'unbekannt';
      const day = parseInt(pt[0]), mo = parseInt(pt[1]);
      // [cutoff_day, month, sign_if_day_<=_cutoff, sign_if_day_>_cutoff]
      const s = [
        [19, 1, 'Steinbock', 'Wassermann'],
        [18, 2, 'Wassermann', 'Fische'],
        [20, 3, 'Fische', 'Widder'],
        [19, 4, 'Widder', 'Stier'],
        [20, 5, 'Stier', 'Zwillinge'],
        [20, 6, 'Zwillinge', 'Krebs'],
        [22, 7, 'Krebs', 'Löwe'],
        [22, 8, 'Löwe', 'Jungfrau'],
        [22, 9, 'Jungfrau', 'Waage'],
        [22, 10, 'Waage', 'Skorpion'],
        [21, 11, 'Skorpion', 'Schütze'],
        [21, 12, 'Schütze', 'Steinbock'],
      ];
      const row = s.find(r => r[1] === mo);
      if (!row) return 'unbekannt';
      return day <= row[0] ? row[2] : row[3];
    }
    function personBlock(p, label) {
      if (!p.firstName) return '';
      const full = `${p.firstName} ${p.lastName}`.trim();
      const n = nameNums(full);
      return `\n${label}: ${full}\n- Geburtsdatum: ${p.birthDate || 'unbekannt'}\n- Geburtszeit: ${p.birthTime || 'unbekannt'}\n- Geburtsort: ${p.birthPlace || 'unbekannt'}\n- Lebenszahl: ${lifeNum(p.birthDate)}\n- Seelendrang: ${n.soul}\n- Persönlichkeitszahl: ${n.personality}\n- Ausdruckszahl: ${n.expression}\n- Persönliches Jahr 2025: ${persYear(p.birthDate)}\n- Sternzeichen: ${zodiac(p.birthDate)}`;
    }

    // ── PROMPT ─────────────────────────────────────────────────────
    function buildPrompt() {
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      const hasKids = state.constellation === 'family' || state.constellation === 'solo_children';
      const p1 = getPerson('p1'), p2 = hasPair ? getPerson('p2') : null;

      // Kompatibilitätszahl
      let compatBlock = '';
      if (hasPair && p2) {
        const lz1 = lifeNum(p1.birthDate);
        const lz2 = lifeNum(p2.birthDate);
        const compat = compatNum(lz1, lz2);
        compatBlock = `\nKOMPATIBILITÄTSZAHL (Beziehungscode): ${compat} (${lz1} + ${lz2} → ${compat})`;
      }

      // Namenswechsel
      const nc1 = nameChangeBlock('p1', 'PERSON 1');
      const nc2 = hasPair ? nameChangeBlock('p2', 'PERSON 2') : '';
      const hasNameChange = nc1 || nc2;

      let coupleBlock = '';
      if (hasPair) {
        const meet = val('meet-date'), wed = val('wedding-date');
        if (meet || wed) {
          coupleBlock = '\nSCHLÜSSELDATEN:';
          if (meet) coupleBlock += `\n- Kennenlernen: ${meet} → Code: ${lifeNum(meet.replace(/\./g, ''))}`;
          if (wed) coupleBlock += `\n- Hochzeit: ${wed} → Code: ${lifeNum(wed.replace(/\./g, ''))}`;
        }
      }
      const kids = hasKids ? getChildren().map((c, i) => personBlock(c, `KIND ${i + 1}`)).join('\n') : '';

      // Pre-compute name numerology (vollständig, Vorname, Nachname einzeln)
      function calcNameNums(firstName, lastName) {
        if (!firstName) return null;
        const full = `${firstName} ${lastName}`.trim();
        const nFull = nameNums(full);
        const nVor = nameNums(firstName);
        const nNach = lastName ? nameNums(lastName) : null;
        return { firstName, lastName, full, nFull, nVor, nNach };
      }
      function nameNumsText(nn, label) {
        if (!nn) return '';
        return `NAMEN-NUMEROLOGIE ${label}:
- Vollständiger Name (${nn.full}): Seelendrang=${nn.nFull.soul}, Persönlichkeit=${nn.nFull.personality}, Ausdruck=${nn.nFull.expression}
- Vorname (${nn.firstName}): Seelendrang=${nn.nVor.soul}, Persönlichkeit=${nn.nVor.personality}, Ausdruck=${nn.nVor.expression}${nn.nNach ? `\n- Nachname (${nn.lastName}): Seelendrang=${nn.nNach.soul}, Persönlichkeit=${nn.nNach.personality}, Ausdruck=${nn.nNach.expression}` : ''}`;
      }
      const nn1 = calcNameNums(p1.firstName, p1.lastName);
      const nn2 = hasPair && p2 ? calcNameNums(p2.firstName, p2.lastName) : null;
      const nnKids = hasKids ? getChildren().map(c => calcNameNums(c.firstName, c.lastName)) : [];

      return `Du bist ein erfahrener Astrologe und Numerologe. Erstelle eine tiefe, persönliche Analyse auf Deutsch, direkt ansprechend (du).

KONSTELLATION: ${state.constellation}
FOKUS: ${state.focus}
${personBlock(p1, 'PERSON 1')}
${p2 ? personBlock(p2, 'PERSON 2') : ''}
${compatBlock}
${coupleBlock}
${kids}
${nc1}${nc2}

VORBERECHNETE NAMEN-NUMEROLOGIE (diese Zahlen sind korrekt — verwende sie exakt so):
${nameNumsText(nn1, 'PERSON 1')}
${nn2 ? nameNumsText(nn2, 'PERSON 2') : ''}
${nnKids.map((nn, i) => nameNumsText(nn, `KIND ${i+1}`)).join('\n')}

Gib die Analyse als strukturierten Text zurück. Trenne Sektionen mit ~~~.
Jede Sektion beginnt mit dem Titel, dann einem Zeilenumbruch, dann dem Inhalt.

Verwende folgende spezielle Markierungen innerhalb der Sektionen:

Für grosse Zahlen / Codes: [ZAHL:11] oder [ZAHL:11/3]
Für Personen-Cards (2 nebeneinander): [PERSON-GRID-START] ... [PERSON-CARD:Label|Name|Datum · Zeit · Ort|Sternzeichen|Beschreibung|LZ:11|Pinnacle:9|PersJahr:4] ... [PERSON-GRID-END]
Für 2-spaltige Info-Karten: [KARTEN-GRID-START] ... [KARTE:Eyebrow|Titel|Untertitel|Beschreibung] ... [KARTEN-GRID-END]
Für Beziehungs-Dynamik: [DYNAMIK:SIE-Label|SIE-Zahl|ER-Label|ER-Zahl|Resonanz-Text]
Für astrologische Verbindungen als Karten: [ASTRO-START] ... [ASTRO:Symbol|Titel|Text] ... [ASTRO-END]
Für Herausforderung & Schlüssel 2-spaltig: [HS-START] ... [HERAUSFORDERUNG:Text] ... [SCHLUESSEL:Text] ... [HS-END]
Für Jahresenergien-Tabelle: Nur so viele Spalten wie tatsächlich Personen vorhanden sind. Verwende: [JAHRES-TABELLE:${[p1.firstName, hasPair && p2?.firstName, ...(hasKids ? getChildren().map(c => c.firstName) : [])].filter(Boolean).join('|')}] gefolgt von Zeilen: [JAHR:2025|Zahl·Keyword${hasPair ? '|Zahl·Keyword' : ''}${hasKids ? getChildren().map(() => '|Zahl·Keyword').join('') : ''}]
Für Pinnacles: [PINNACLE:Person|Nummer|Zeitraum|Zahl|Beschreibung|Challenge]
Für Namen-Numerologie Cards: [NAMEN-GRID-START] ... [NAMEN-CARD:Name|Rolle|Seelendrang-Zahl|Seelendrang-Label|Pers-Zahl|Pers-Label|Ausdruck-Zahl|Ausdruck-Label|Beschreibung] ... [NAMEN-GRID-END]
PFLICHTREGELN für NAMEN-CARD:
- Name = vollständiger Name in normaler Schreibweise, KEINE Bindestriche zwischen Buchstaben (richtig: "Mauro Casellini", falsch: "M-A-U-R-O")
- Rolle = kurze Bezeichnung wie "Vollständiger Name · Lebenszahl 11" oder "Vorname" oder "Nachname"
- Alle drei Zahlenpaare (Seelendrang, Persönlichkeit, Ausdruck) MÜSSEN echte berechnete Zahlen enthalten — niemals "—" oder leer lassen
- Berechne die Zahlen selbst aus dem Namen nach dem pythagoreischen System (A=1,B=2,...,I=9,J=1,...)
- Beispiel korrekt: [NAMEN-CARD:Mauro Casellini|Vollständiger Name|1|Pionier|4|Struktur|5|Freiheit|Beschreibung hier]
Für Essenz (letzter Satz, gross): [ESSENZ:Text]
Für normalen Fliesstext: einfach Text ohne Markierung.

Erstelle folgende Sektionen:
1. Der zentrale Code — mit [ZAHL:X] für den Haupt-Code, dann Erklärung
${hasPair ? `2. Schlüsseldaten des Paares — mit [KARTEN-GRID-START/END] für Kennenlernen & Hochzeit, dann [PERSON-GRID-START/END] für beide. Erwähne den Beziehungscode (Kompatibilitätszahl).
3. Beziehungsdynamik — mit [DYNAMIK:...] und Erklärungstext
4. Astrologische Kernverbindungen — mit [ASTRO-START/END]
` : `2. Dein persönlicher Lebensweg — Fliesstext
3. Deine Namen-Energie — mit [NAMEN-GRID-START/END]
`}
${hasKids ? `5. Die Kinder — mit [PERSON-GRID-START/END] pro Kind, Fliesstext dazu
` : ''}
${state.constellation === 'family' ? `6. Das Familiensystem — Fliesstext mit Rollen
` : ''}
7. Herausforderung & Schlüssel — mit [HS-START/END]
8. Jahresenergien 2025–2030 — mit [JAHRES-TABELLE:...] und [JAHR:...] Zeilen
9. Pinnacles & Challenges — mit [PINNACLE:...] für jede Person
10. Namen-Numerologie — mit [NAMEN-GRID-START/END]
${hasNameChange ? `11. Namenswechsel & seine Energie — analysiere den/die Namenswechsel: was verändert sich numerologisch? Welche Energie kommt, welche geht? Verwende [NAMEN-GRID-START/END] für den Vergleich.
12. Die Essenz — mit [ESSENZ:Ein einziger Satz der alles zusammenfasst]` : `11. Die Essenz — mit [ESSENZ:Ein einziger Satz der alles zusammenfasst]`}

Schreibe tief, präzise, persönlich. Keine generischen Aussagen. Zahlen und astrologische Fakten exakt aus den gegebenen Daten ableiten.
WICHTIG: Verwende die strukturierten Tags konsequent. Fliesstext darf **fett** und *kursiv* enthalten. Die Jahresenergien MÜSSEN als [JAHRES-TABELLE] formatiert sein — KEIN Fliesstext mit "**2026 (Jahr 6):**" statt Tabelle.
    }

    // ── LOADING CYCLE ──────────────────────────────────────────────
    const LT = ['Lebenszahlen werden ermittelt…', 'Astrologische Verbindungen werden gewoben…', 'Seelenlandschaft entfaltet sich…'];
    let li = null, lx = 0;
    function startLoader() {
      lx = 0;
      const el = document.getElementById('loading-sub');
      if (el) el.textContent = LT[0];
      li = setInterval(() => {
        const sub = document.getElementById('loading-sub');
        if (!sub) return;
        sub.classList.add('hidden');
        setTimeout(() => {
          lx = (lx + 1) % LT.length;
          sub.textContent = LT[lx];
          sub.classList.remove('hidden');
        }, 400);
      }, 2200);
    }
    function stopLoader() { if (li) { clearInterval(li); li = null; } }

    // ── API CALL ───────────────────────────────────────────────────
    async function startAnalysis() {
      showScreen('loading');
      startLoader();
      const p1 = getPerson('p1'), p2 = getPerson('p2');
      const hasPair = state.constellation === 'pair' || state.constellation === 'family';
      let name = p1.firstName || state.lead.name || 'Deine Analyse';
      if (hasPair && p2.firstName) name += ` & ${p2.firstName}`;
      const nameEl = document.getElementById('result-name');
      if (nameEl) nameEl.textContent = name;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: buildPrompt() }],
            lead: {
              name: state.lead.name,
              email: state.lead.email,
              constellation: state.constellation,
              focus: state.focus,
            },
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        stopLoader();
        renderResult(data.content?.[0]?.text || '');
      } catch (err) {
        stopLoader();
        renderError(err.message);
      }
      showScreen('result');
    }

    // ── RENDER RESULT ──────────────────────────────────────────────
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    // Parses inline markdown AFTER escaping — works on already-escaped text
    // so we inject safe HTML tags back in
    function parseMarkdown(escapedText) {
      return escapedText
        // **bold** → <strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // *italic* or _italic_ (not double-star)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // ~~strikethrough~~ (uncommon but possible)
        .replace(/~~(.+?)~~/g, '<del>$1</del>');
    }

    function parseInlineMarkers(text) {
      // [ZAHL:X] → big number display
      text = text.replace(/\[ZAHL:([^\]]+)\]/g, (_, z) =>
        `<div class="res-big-zahl">${esc(z)}</div>`);
      return text;
    }

    function parseBlock(block) {
      let out = '';
      const lines = block.split('\n');
      let i = 0;

      while (i < lines.length) {
        const line = lines[i].trim();

        // PERSON-GRID
        if (line === '[PERSON-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[PERSON-GRID-END]') {
            const m = lines[i].trim().match(/^\[PERSON-CARD:(.+)\]$/);
            if (m) {
              const [label, name, datum, stern, desc, lz, pin, pj] = m[1].split('|');
              const lzNum = (lz||'').replace('LZ:','');
              const pinNum = (pin||'').replace('Pinnacle:','');
              const pjNum = (pj||'').replace('PersJahr:','');
              cards.push(`<div class="res-person-card">
                <div class="res-pc-label">${esc(label||'')}</div>
                <div class="res-pc-zahl">${esc(lzNum)}</div>
                <div class="res-pc-datum">${esc(datum||'')}</div>
                <div class="res-pc-stern">${esc(stern||'')}</div>
                <div class="res-pc-desc">${parseMarkdown(esc(desc||''))}</div>
                <div class="res-pc-stats">
                  ${lzNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(lzNum)}</div><div class="res-pc-stat-label">Lebenszahl</div></div>` : ''}
                  ${pinNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(pinNum)}</div><div class="res-pc-stat-label">Pinnacle (Jetzt)</div></div>` : ''}
                  ${pjNum ? `<div class="res-pc-stat"><div class="res-pc-stat-val">${esc(pjNum)}</div><div class="res-pc-stat-label">Pers. Jahr 2025</div></div>` : ''}
                </div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-person-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // KARTEN-GRID
        if (line === '[KARTEN-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[KARTEN-GRID-END]') {
            const m = lines[i].trim().match(/^\[KARTE:(.+)\]$/);
            if (m) {
              const [eyebrow, titel, untertitel, desc] = m[1].split('|');
              cards.push(`<div class="res-karte">
                <div class="res-karte-eyebrow">${esc(eyebrow||'')}</div>
                <div class="res-karte-zahl">${esc(untertitel||'')}</div>
                <div class="res-karte-titel">${esc(titel||'')}</div>
                <div class="res-karte-desc">${esc(desc||'')}</div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-karten-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // DYNAMIK
        if (line.startsWith('[DYNAMIK:')) {
          const m = line.match(/^\[DYNAMIK:(.+)\]$/);
          if (m) {
            const [sieLabel, sieZahl, erLabel, erZahl, resonanz] = m[1].split('|');
            out += `<div class="res-dynamik">
              <div class="res-dyn-pole">
                <div class="res-dyn-pole-item">
                  <div class="res-dyn-zahl">${esc(sieZahl||'')}</div>
                  <div class="res-dyn-label">${esc(sieLabel||'')}</div>
                </div>
                <div class="res-dyn-arrows">⇅<div class="res-dyn-resonanz">${esc(resonanz||'RESONANZ')}</div>⇅</div>
                <div class="res-dyn-pole-item">
                  <div class="res-dyn-zahl">${esc(erZahl||'')}</div>
                  <div class="res-dyn-label">${esc(erLabel||'')}</div>
                </div>
              </div>
            </div>`;
          }
          i++;
          continue;
        }

        // ASTRO
        if (line === '[ASTRO-START]') {
          let items = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[ASTRO-END]') {
            const m = lines[i].trim().match(/^\[ASTRO:(.+)\]$/);
            if (m) {
              const [symbol, titel, text] = m[1].split('|');
              items.push(`<div class="res-astro-item">
                <div class="res-astro-symbol">${esc(symbol||'')}</div>
                <div class="res-astro-body">
                  <div class="res-astro-titel">${esc(titel||'')}</div>
                  <div class="res-astro-text">${parseMarkdown(esc(text||''))}</div>
                </div>
              </div>`);
            }
            i++;
          }
          out += `<div class="res-astro-list">${items.join('')}</div>`;
          i++;
          continue;
        }

        // HS (Herausforderung & Schlüssel)
        if (line === '[HS-START]') {
          let heraus = [], schluessel = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[HS-END]') {
            const l = lines[i].trim();
            const mh = l.match(/^\[HERAUSFORDERUNG:(.+)\]$/);
            const ms = l.match(/^\[SCHLUESSEL:(.+)\]$/);
            if (mh) heraus.push(mh[1]);
            if (ms) schluessel.push(ms[1]);
            i++;
          }
          out += `<div class="res-hs-grid">
            <div class="res-hs-col res-hs-challenge">
              <div class="res-hs-header">Herausforderung</div>
              ${heraus.map(h => `<div class="res-hs-item">— ${parseMarkdown(esc(h))}</div>`).join('')}
            </div>
            <div class="res-hs-col res-hs-key">
              <div class="res-hs-header">Schlüssel</div>
              ${schluessel.map(s => `<div class="res-hs-item">— ${parseMarkdown(esc(s))}</div>`).join('')}
            </div>
          </div>`;
          i++;
          continue;
        }

        // JAHRES-TABELLE
        if (line.startsWith('[JAHRES-TABELLE:')) {
          const m = line.match(/^\[JAHRES-TABELLE:(.+)\]$/);
          // Filter out empty header slots (empty string or just whitespace)
          const allHeaders = m ? m[1].split('|') : [];
          const headers = allHeaders.filter(h => h.trim() !== '');
          const activeCols = headers.length; // how many real person columns
          let rows = [];
          i++;
          while (i < lines.length && lines[i].trim().startsWith('[JAHR:')) {
            const rm = lines[i].trim().match(/^\[JAHR:(.+)\]$/);
            if (rm) {
              const allCells = rm[1].split('|');
              // Keep year + only as many data cells as we have headers
              const year = allCells[0];
              const cells = allCells.slice(1, activeCols + 1)
                .filter((c, idx) => {
                  // Only include if header exists for this column
                  return headers[idx] && headers[idx].trim() !== '';
                });
              rows.push([year, ...cells]);
            }
            i++;
          }
          out += `<div class="res-tabelle-wrap"><table class="res-tabelle">
            <thead><tr>
              <th>Jahr</th>
              ${headers.map(h => `<th>${esc(h)}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map((r, ri) => `<tr class="${ri === 0 ? 'res-row-now' : ''}">
                <td class="res-jahr-cell">${esc(r[0]||'')}</td>
                ${r.slice(1).map(cell => {
                  const trimmed = cell.trim();
                  // Skip dash-only cells
                  if (!trimmed || trimmed === '—' || trimmed === '-' || trimmed === '–') {
                    return '<td><span class="res-tab-zahl" style="color:var(--gold-pale)">—</span></td>';
                  }
                  const parts = trimmed.split('·');
                  const num = parts[0] ? parts[0].trim() : '';
                  const kw = parts[1] ? parts[1].trim() : '';
                  return `<td><span class="res-tab-zahl">${esc(num)}</span>${kw ? `<span class="res-tab-kw">${esc(kw)}</span>` : ''}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table></div>`;
          continue;
        }

        // PINNACLE
        if (line.startsWith('[PINNACLE:')) {
          const m = line.match(/^\[PINNACLE:(.+)\]$/);
          if (m) {
            const [person, nummer, zeitraum, zahl, beschreibung, challenge] = m[1].split('|');
            out += `<div class="res-pinnacle">
              <div class="res-pin-zahl">${esc(zahl||'')}</div>
              <div class="res-pin-body">
                <div class="res-pin-header">
                  <span class="res-pin-num">${esc(nummer||'')}. Pinnacle</span>
                  <span class="res-pin-zeit">${esc(zeitraum||'')}</span>
                  ${person ? `<span class="res-pin-person">${esc(person)}</span>` : ''}
                </div>
                <div class="res-pin-desc">${parseMarkdown(esc(beschreibung||''))}</div>
                ${challenge ? `<div class="res-pin-challenge">Challenge: ${esc(challenge)}</div>` : ''}
              </div>
            </div>`;
          }
          i++;
          continue;
        }

        // NAMEN-GRID
        if (line === '[NAMEN-GRID-START]') {
          let cards = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '[NAMEN-GRID-END]') {
            const m = lines[i].trim().match(/^\[NAMEN-CARD:(.+)\]$/);
            if (m) {
              const [nameRaw, rolle, sdZ, sdL, pZ, pL, ausZ, ausL, desc] = m[1].split('|');
              // Strip letter-by-letter hyphens ("M-A-U-R-O" → "MAURO"), keep normal word hyphens
              const name = (nameRaw||'').replace(/(?<=[A-ZÄÖÜ])-(?=[A-ZÄÖÜ])/g, '').replace(/(?<=[a-zäöü])-(?=[a-zäöü])/g, '');
              const isDash = v => !v || v.trim() === '—' || v.trim() === '-' || v.trim() === '';
              const zahlenItems = [
                { z: sdZ, zl: 'Seelendrang', ll: sdL },
                { z: pZ, zl: 'Persönlichkeit', ll: pL },
                { z: ausZ, zl: 'Ausdruck', ll: ausL },
              ].filter(item => !isDash(item.z)); // skip empty/dash slots
              cards.push(`<div class="res-namen-card">
                <div class="res-nc-name">${esc(name)}</div>
                <div class="res-nc-rolle">${esc(rolle||'')}</div>
                <div class="res-nc-zahlen" style="grid-template-columns: repeat(${zahlenItems.length || 3}, 1fr)">
                  ${zahlenItems.map(item => `<div class="res-nc-zahl-item">
                    <div class="res-nc-z">${esc(item.z)}</div>
                    <div class="res-nc-zl">${esc(item.zl)}</div>
                    <div class="res-nc-ll">${esc(item.ll||'')}</div>
                  </div>`).join('')}
                </div>
                ${desc ? `<div class="res-nc-desc">${esc(desc)}</div>` : ''}
              </div>`);
            }
            i++;
          }
          out += `<div class="res-namen-grid">${cards.join('')}</div>`;
          i++;
          continue;
        }

        // ESSENZ
        if (line.startsWith('[ESSENZ:')) {
          const m = line.match(/^\[ESSENZ:(.+)\]$/);
          if (m) out += `<div class="res-essenz">${esc(m[1])}</div>`;
          i++;
          continue;
        }

        // Normal text — group consecutive lines into paragraphs, apply markdown
        if (line && !line.startsWith('[')) {
          // Collect consecutive non-empty, non-tag lines as one paragraph
          let paraLines = [line];
          while (i + 1 < lines.length) {
            const next = lines[i + 1].trim();
            if (next && !next.startsWith('[')) {
              paraLines.push(next);
              i++;
            } else {
              break;
            }
          }
          const paraText = paraLines.join(' ');
          out += `<p class="res-p">${parseMarkdown(parseInlineMarkers(esc(paraText)))}</p>`;
        } else if (!line) {
          // empty line = paragraph break (already handled by grouping above)
        }
        i++;
      }

      return out;
    }

    // ── SECTION GLOSSARY ───────────────────────────────────────────
    const SECTION_INFO = {
      'Der zentrale Code': 'In der Numerologie ist der "zentrale Code" die verdichtete Kernformel einer Person oder Familie — die Lebenszahl kombiniert mit den wichtigsten Schlüsselzahlen. Er zeigt auf einen Blick, welche Energien das Leben am stärksten prägen.',
      'Schlüsseldaten des Paares': 'Jedes Datum trägt eine numerologische Schwingung. Das Datum des Kennenlernens, der Hochzeit oder anderer Schlüsselereignisse wird auf eine Kernzahl reduziert (Quersumme) und gibt Auskunft darüber, unter welcher Energie dieses Ereignis stand.',
      'Beziehungsdynamik': 'Die Beziehungsdynamik beschreibt das energetische Zusammenspiel zweier Menschen — wie ihre Lebenszahlen, Sternzeichen und Namen-Energien miteinander resonieren, sich ergänzen oder reiben. Sie zeigt keine Urteile, sondern Muster.',
      'Astrologische Kernverbindungen': 'Die Astrologie betrachtet, wie die Planetenpositionen zum Geburtszeitpunkt (Sonne, Mond, Aszendent) zweier Menschen miteinander interagieren. Verbindungen zwischen denselben Zeichen oder Planeten zeigen tiefe Resonanz.',
      'Dein persönlicher Lebensweg': 'Die Lebenszahl (errechnet aus dem vollständigen Geburtsdatum) ist die wichtigste Zahl in der Numerologie. Sie beschreibt den übergeordneten Weg, die Lebensaufgabe und die Qualitäten, die eine Person entwickeln soll — nicht das, was man ist, sondern wohin man wächst.',
      'Deine Namen-Energie': 'Der Name trägt eigene numerologische Energie. Seelendrang (Vokale) zeigt das innere Verlangen; Persönlichkeit (Konsonanten) zeigt, wie man nach aussen wirkt; Ausdruckszahl (alle Buchstaben) zeigt das Gesamtpotenzial. Basis ist die Taufname-Zuweisung nach dem pythagoreischen System.',
      'Die Kinder': 'Jedes Kind bringt seine eigene numerologische und astrologische Signatur mit. Die Analyse zeigt, welche Energien das Kind trägt, wie es sich im Familiensystem positioniert und welche Verbindungen zu den Eltern bestehen.',
      'Das Familiensystem': 'Das Familiensystem betrachtet die Familie als energetisches Ganzes — welche Zahlen und Qualitäten dominieren, welche fehlen, wie die einzelnen Mitglieder sich gegenseitig spiegeln und ergänzen. Muster wiederholen sich oft über Generationen.',
      'Herausforderung & Schlüssel': 'Jede Lebenszahl bringt spezifische Herausforderungen mit — wiederkehrende Themen, die das Leben immer wieder aufwirft. Der Schlüssel ist der bewusste Umgang damit: nicht Widerstand, sondern Integration. Herausforderungen sind keine Schwächen, sondern Wachstumsfelder.',
      'Jahresenergien': 'Das Persönliche Jahr wird errechnet aus Geburtstag + Geburtsmonat + aktuellem Kalenderjahr. Es beschreibt, unter welchem energetischen Thema ein Jahr steht — von 1 (Neubeginn) bis 9 (Abschluss). Die neunjährigen Zyklen wiederholen sich lebenslang.',
      'Deine Jahresenergien 2025–2029': 'Das Persönliche Jahr wird errechnet aus Geburtstag + Geburtsmonat + aktuellem Kalenderjahr. Es beschreibt, unter welchem energetischen Thema ein Jahr steht — von 1 (Neubeginn) bis 9 (Abschluss). Die neunjährigen Zyklen wiederholen sich lebenslang.',
      'Pinnacles & Challenges': 'Pinnacles sind längere Lebenszyklen (ca. 7–27 Jahre), die bestimmte Qualitäten in den Vordergrund bringen. Sie werden aus Geburtstag, -monat und -jahr errechnet. Challenges sind die spezifischen Lernthemen innerhalb jedes Pinnacles — die Reibungspunkte, die bewusste Entwicklung verlangen.',
      'Namen-Numerologie': 'Eine detaillierte Aufschlüsselung der Namen-Energie aller Familienmitglieder. Seelendrang, Persönlichkeit und Ausdruck zusammen zeigen, wie inneres Verlangen, äussere Wirkung und Gesamtpotenzial zueinander stehen — und wie die Mitglieder sich numerologisch spiegeln.',
      'Die Essenz': 'Ein einziger Satz, der das Wesen dieser Analyse zusammenfasst — die verdichtete Quintessenz aller Zahlen, Zeichen und Verbindungen.',
    };

    function getSectionInfo(title) {
      // fuzzy match
      for (const key of Object.keys(SECTION_INFO)) {
        if (title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(title.toLowerCase())) {
          return SECTION_INFO[key];
        }
      }
      return null;
    }

    function renderResult(text) {
      const secs = text.split('~~~').map(s => s.trim()).filter(Boolean);
      const body = document.getElementById('result-body');
      if (!body) return;
      body.innerHTML = secs.map((sec, idx) => {
        const lines = sec.split('\n');
        const titleRaw = lines[0].replace(/^#+\s*/, '').trim();
        const bodyText = lines.slice(1).join('\n').trim();
        const orn = idx < secs.length - 1 ? `<div class="result-ornament">✦ ✦ ✦</div>` : '';
        const info = getSectionInfo(titleRaw);
        const infoHtml = info
          ? `<button class="sec-info-btn" onclick="this.nextElementSibling.classList.toggle('open')" title="Was bedeutet das?">i</button>
             <div class="sec-info-panel">${esc(info)}</div>`
          : '';
        return `<div class="result-section">
          <div class="result-section-title-row">
            <div class="result-section-title">${esc(titleRaw)}</div>
            ${infoHtml}
          </div>
          <div class="result-body-inner">${parseBlock(bodyText)}</div>
        </div>${orn}`;
      }).join('');
    }
    function renderError(msg) {
      const body = document.getElementById('result-body');
      if (body) body.innerHTML = `<div class="error-box">⚠ ${esc(msg)}<br><small>Bitte versuche es erneut.</small></div>`;
    }

    // ── RESET ──────────────────────────────────────────────────────
    function resetAll() {
      state.constellation = ''; state.focus = ''; state.childCount = 1;
      state.lead = { name: '', email: '' };
      document.querySelectorAll('.field-input').forEach(el => { el.value = ''; el.disabled = false; });
      document.querySelectorAll('.toggle-box').forEach(el => el.classList.remove('on'));
      document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      const btn1 = document.getElementById('btn-constellation-next');
      const btn2 = document.getElementById('btn-focus-next');
      const btn3 = document.getElementById('btn-lead-next');
      if (btn1) btn1.disabled = true;
      if (btn2) btn2.disabled = true;
      if (btn3) btn3.disabled = true;
      const leadName = document.getElementById('lead-name');
      const leadEmail = document.getElementById('lead-email');
      if (leadName) leadName.value = '';
      if (leadEmail) leadEmail.value = '';
      const resultBody = document.getElementById('result-body');
      if (resultBody) resultBody.innerHTML = '';
      const childContainer = document.getElementById('children-container');
      if (childContainer) childContainer.innerHTML = childBlockHTML(0);
      const addBtn = document.getElementById('btn-add-child');
      if (addBtn) addBtn.style.display = '';
      showScreen('splash');
    }

    // ── INIT FORMS ─────────────────────────────────────────────────
    const p1form = document.getElementById('person1-form');
    if (p1form) p1form.innerHTML = personFormHTML('p1');
    const p2form = document.getElementById('person2-form');
    if (p2form) p2form.innerHTML = personFormHTML('p2');
    const childContainer = document.getElementById('children-container');
    if (childContainer) childContainer.innerHTML = childBlockHTML(0);
    updateNav();

    // Lead gate input listeners
    document.addEventListener('input', (e) => {
      if (e.target.id === 'lead-name' || e.target.id === 'lead-email') validateLead();
    });
    document.addEventListener('keydown', (e) => {
      if ((e.target.id === 'lead-name' || e.target.id === 'lead-email') && e.key === 'Enter') {
        const btn = document.getElementById('btn-lead-next');
        if (btn && !btn.disabled) submitLead();
      }
    });

    // ── EVENT DELEGATION ───────────────────────────────────────────
    document.addEventListener('click', (e) => {
      // Select cards
      const card = e.target.closest('.select-card');
      if (card) {
        const grid = card.closest('[class*="card-grid"]');
        if (grid) {
          const type = card.dataset.cardType;
          selectCard(card, type || (card.closest('#screen-constellation') ? 'constellation' : 'focus'));
        }
      }
      // Toggle rows
      const toggleRow = e.target.closest('.toggle-row');
      if (toggleRow) {
        const inputId = toggleRow.dataset.toggleInput;
        const toggleId = toggleRow.dataset.toggleId;
        if (inputId && toggleId) toggleField(inputId, toggleId);
      }
      // Remove child buttons
      const removeBtn = e.target.closest('[data-remove-child]');
      if (removeBtn) removeChild(parseInt(removeBtn.dataset.removeChild));
      // Nav actions — use closest() so clicks on child elements (spans, icons) still register
      const btn = e.target.closest('button, [role="button"]');
      if (btn) {
        const id = btn.id;
        if (id === 'nav-reset') resetAll();
        if (id === 'btn-add-child') addChild();
        if (id === 'btn-lead-next') submitLead();
        if (id === 'btn-constellation-next') goNext();
        if (id === 'btn-focus-next') startAnalysis();
        if (btn.classList.contains('btn-back')) goBack();
        if (btn.classList.contains('btn-next-generic')) goNext();
        if (id === 'hero-cta-btn') goNext();
        if (id === 'btn-print') window.print();
        if (id === 'btn-reset-result') resetAll();
      }
    });

  }, []);

  return (
    <>
      <Head>
        <title>Familien-Code · herzbewegung von Susana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Raleway:wght@300;400;500&display=swap" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
        <script dangerouslySetInnerHTML={{__html: `
          window.addEventListener('load', function() {
            if (window.emailjs && '${process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''}') {
              window.emailjs.init({ publicKey: '${process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''}' });
            }
          });
        `}} />
        <style>{`
          :root {
            --cream: #fdf8f2;
            --paper: #f7efe4;
            --paper-deep: #f0e5d6;
            --gold: #a07828;
            --gold-light: #c49840;
            --gold-pale: #ecddb8;
            --gold-faint: #fdf5e8;
            --rose: #9e5472;
            --rose-light: #c4849e;
            --rose-pale: #f5e8ef;
            --ink: #2a1f18;
            --muted: #7a6358;
            --silver: #a89080;
            --mauve: #8a6070;
          }

          /* ── BASE ─────────────────────────────────────────────── */
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html { font-size: 16px; }
          body {
            font-family: 'Raleway', sans-serif;
            font-weight: 300;
            color: var(--ink);
            background: var(--cream);
          }

          /* ── TOPNAV ───────────────────────────────────────────── */
          .topnav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            background: rgba(253,248,242,0.95);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--gold-pale);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 56px; height: 68px;
          }
          .nav-brand { display: flex; align-items: center; gap: 12px; }
          .nav-symbol { font-size: 20px; color: var(--rose-light); }
          .nav-name {
            font-family: 'Playfair Display', serif;
            font-size: 18px; font-weight: 400;
            color: var(--ink); letter-spacing: 0.3px;
          }
          .nav-by {
            font-size: 9px; letter-spacing: 2.5px;
            text-transform: uppercase; color: var(--rose-light); margin-left: 4px;
          }
          .nav-progress { display: flex; align-items: center; gap: 6px; }
          .nav-step { width: 24px; height: 2px; background: var(--gold-pale); border-radius: 2px; transition: background 0.3s; }
          .nav-step.done { background: var(--rose-light); }
          .nav-step.active { background: var(--rose); }
          .nav-cta {
            font-size: 9px; letter-spacing: 2px; text-transform: uppercase;
            color: var(--muted); cursor: pointer; padding: 8px 0;
            background: none; border: none;
            font-family: 'Raleway', sans-serif; transition: color 0.2s;
          }
          .nav-cta:hover { color: var(--rose); }

          /* ── SCREENS ──────────────────────────────────────────── */
          .screen { display: none; padding-top: 68px; }
          .screen.active { display: block; animation: fadeUp 0.45s ease forwards; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

          /* ── HERO / SPLASH ────────────────────────────────────── */
          #screen-splash { min-height: 100vh; display: none; flex-direction: column; }
          #screen-splash.active { display: flex; }

          .hero {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: calc(100vh - 68px);
          }

          /* Left — warm cream with rose gradient, no dark background */
          .hero-left {
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 60%, var(--rose-pale) 100%);
            padding: 80px 72px;
            display: flex; flex-direction: column; justify-content: center;
            position: relative; overflow: hidden;
          }
          .hero-left::before {
            content: '';
            position: absolute; top: -80px; right: -80px;
            width: 360px; height: 360px; border-radius: 50%;
            background: radial-gradient(circle, rgba(196,152,64,0.12) 0%, transparent 70%);
          }
          .hero-left::after {
            content: '';
            position: absolute; bottom: -60px; left: 40px;
            width: 260px; height: 260px; border-radius: 50%;
            background: radial-gradient(circle, rgba(158,84,114,0.10) 0%, transparent 70%);
          }
          /* decorative top line */
          .hero-left-inner { position: relative; z-index: 1; }

          .hero-eyebrow {
            font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
            color: var(--rose); margin-bottom: 28px; font-weight: 400;
          }
          .hero-symbol {
            font-size: 32px; color: var(--rose-light);
            margin-bottom: 20px; display: block;
            animation: float 6s ease-in-out infinite;
          }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }

          .hero-h1 {
            font-family: 'Playfair Display', serif;
            font-size: 68px; font-weight: 400;
            line-height: 0.98; color: var(--ink);
            margin-bottom: 28px; letter-spacing: -0.5px;
          }
          .hero-h1 em {
            font-style: italic; color: var(--rose);
          }

          .hero-rule {
            width: 40px; height: 1px;
            background: linear-gradient(90deg, var(--rose-light), transparent);
            margin-bottom: 24px;
          }
          .hero-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 18px;
            color: var(--muted); line-height: 1.7;
            max-width: 380px; margin-bottom: 48px;
          }
          .hero-cta {
            display: inline-flex; align-items: center; gap: 12px;
            background: var(--rose); color: white;
            font-family: 'Raleway', sans-serif; font-weight: 400;
            font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase;
            padding: 16px 40px; border-radius: 40px; border: none; cursor: pointer;
            transition: background 0.22s, transform 0.12s; width: fit-content;
            box-shadow: 0 4px 20px rgba(158,84,114,0.25);
          }
          .hero-cta:hover { background: var(--mauve); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(158,84,114,0.30); }
          .hero-cta-arrow { font-size: 15px; transition: transform 0.2s; }
          .hero-cta:hover .hero-cta-arrow { transform: translateX(4px); }

          /* tagline under CTA */
          .hero-tagline {
            margin-top: 20px;
            font-size: 10px; color: var(--silver);
            letter-spacing: 0.5px; font-style: italic;
            font-family: 'Playfair Display', serif;
          }

          /* Right side */
          .hero-right {
            background: var(--cream);
            padding: 80px 64px;
            display: flex; flex-direction: column; justify-content: center;
            border-left: 1px solid var(--gold-pale);
          }
          .hero-features-title {
            font-size: 9px; letter-spacing: 3px; text-transform: uppercase;
            color: var(--rose-light); margin-bottom: 28px; font-weight: 400;
          }
          .feature-list { display: flex; flex-direction: column; gap: 0; }
          .feature-item {
            display: grid; grid-template-columns: 44px 1fr;
            align-items: start; gap: 0;
            padding: 20px 0; border-bottom: 1px solid var(--gold-pale);
          }
          .feature-item:first-child { border-top: 1px solid var(--gold-pale); }
          .feature-num {
            font-family: 'Playfair Display', serif;
            font-size: 28px; font-weight: 400;
            color: var(--rose-pale); line-height: 1; padding-top: 3px;
          }
          .feature-title {
            font-family: 'Playfair Display', serif;
            font-size: 18px; color: var(--ink); margin-bottom: 4px;
          }
          .feature-desc { font-size: 11px; color: var(--muted); line-height: 1.6; }

          /* ── GLOSSAR ──────────────────────────────────────────── */
          .hero-glossar { margin-top: 36px; padding-top: 28px; border-top: 1px solid var(--gold-pale); }
          .hero-glossar-title { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 16px; font-weight: 400; }
          .hero-glossar-grid { display: flex; flex-direction: column; gap: 0; }
          .hero-glossar-item { display: grid; grid-template-columns: 130px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--gold-pale); align-items: baseline; }
          .hero-glossar-item:last-child { border-bottom: none; }
          .hero-glossar-term { font-family: 'Playfair Display', serif; font-size: 14px; color: var(--ink); }
          .hero-glossar-def { font-size: 10.5px; color: var(--muted); line-height: 1.55; }

          /* ── LEAD GATE ────────────────────────────────────────── */
          #screen-lead {
            min-height: 100vh; display: none;
            align-items: center; justify-content: center;
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 50%, var(--rose-pale) 100%);
            padding-top: 68px;
          }
          #screen-lead.active { display: flex; }
          .lead-wrap { width: 100%; max-width: 500px; padding: 48px 32px; }
          .lead-eyebrow { font-size: 9px; letter-spacing: 3.5px; text-transform: uppercase; color: var(--rose); margin-bottom: 16px; font-weight: 400; }
          .lead-title {
            font-family: 'Playfair Display', serif;
            font-size: 44px; font-weight: 400; color: var(--ink);
            line-height: 1.08; margin-bottom: 14px;
          }
          .lead-title em { font-style: italic; color: var(--rose); }
          .lead-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 17px; color: var(--muted);
            line-height: 1.7; margin-bottom: 44px;
          }
          .lead-field { margin-bottom: 28px; }
          .lead-label { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; font-weight: 400; }
          .lead-input {
            width: 100%; background: transparent; border: none;
            border-bottom: 1px solid var(--gold-pale);
            padding: 6px 0 14px;
            font-family: 'Playfair Display', serif; font-size: 22px;
            color: var(--ink); outline: none;
            transition: border-color 0.2s;
          }
          .lead-input:focus { border-bottom-color: var(--rose); }
          .lead-input::placeholder { color: var(--silver); font-style: italic; }
          .lead-privacy { font-size: 10.5px; color: var(--silver); margin-top: 18px; line-height: 1.55; }
          .lead-btn {
            width: 100%; margin-top: 36px;
            background: var(--rose); color: white; border: none;
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2.5px; text-transform: uppercase;
            padding: 18px; border-radius: 40px; cursor: pointer;
            transition: background 0.22s, transform 0.12s;
            box-shadow: 0 4px 20px rgba(158,84,114,0.22);
          }
          .lead-btn:hover { background: var(--mauve); transform: translateY(-1px); }
          .lead-btn:disabled { opacity: 0.3; cursor: default; pointer-events: none; }

          /* ── FORM ─────────────────────────────────────────────── */
          .form-page { max-width: 820px; margin: 0 auto; padding: 68px 56px 96px; }
          .form-page-header { margin-bottom: 52px; padding-bottom: 36px; border-bottom: 1px solid var(--gold-pale); }
          .form-eyebrow { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 12px; font-weight: 400; }
          .form-h2 {
            font-family: 'Playfair Display', serif;
            font-size: 48px; font-weight: 400; line-height: 1.05;
            color: var(--ink); margin-bottom: 12px; letter-spacing: -0.3px;
          }
          .form-sub {
            font-family: 'Playfair Display', serif;
            font-style: italic; font-size: 17px;
            color: var(--muted); line-height: 1.65; max-width: 540px;
          }

          /* ── CARDS ────────────────────────────────────────────── */
          .card-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 48px; }
          .card-grid-2-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 48px; }
          .select-card {
            background: white; border: 1.5px solid var(--gold-pale); border-radius: 18px; padding: 26px;
            cursor: pointer; display: flex; flex-direction: column; gap: 10px;
            position: relative; overflow: hidden;
            transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
          }
          .select-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: transparent; transition: background 0.2s; border-radius: 18px 18px 0 0; }
          .select-card:hover { border-color: var(--rose-pale); box-shadow: 0 8px 32px rgba(158,84,114,0.10); transform: translateY(-2px); }
          .select-card.selected { border-color: var(--rose-light); background: var(--rose-pale); box-shadow: 0 8px 28px rgba(158,84,114,0.14); }
          .select-card.selected::before { background: var(--rose); }
          .card-top { display: flex; align-items: center; justify-content: space-between; }
          .card-icon { font-size: 22px; color: var(--rose-light); }
          .card-check { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--gold-pale); display: flex; align-items: center; justify-content: center; font-size: 9px; color: transparent; transition: all 0.2s; }
          .select-card.selected .card-check { background: var(--rose); border-color: var(--rose); color: white; }
          .card-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--ink); }
          .card-desc { font-size: 11px; color: var(--muted); line-height: 1.55; }

          /* ── INPUTS ───────────────────────────────────────────── */
          .field-group { margin-bottom: 32px; }
          .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; }
          .field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
          .field-label { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; font-weight: 400; }
          .field-input {
            width: 100%; background: transparent; border: none;
            border-bottom: 1px solid #ddd0c0;
            padding: 4px 0 14px;
            font-family: 'Playfair Display', serif; font-size: 21px;
            color: var(--ink); outline: none; transition: border-color 0.2s; -webkit-appearance: none;
          }
          .field-input:focus { border-bottom-color: var(--rose); }
          .field-input::placeholder { color: #c8bcb0; font-style: italic; }
          .field-input:disabled { opacity: 0.25; }
          .toggle-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; cursor: pointer; }
          .toggle-label { font-size: 11px; color: var(--silver); user-select: none; }
          .toggle-box { width: 34px; height: 19px; border-radius: 10px; background: #d8cec8; position: relative; flex-shrink: 0; transition: background 0.2s; }
          .toggle-box.on { background: var(--rose); }
          .toggle-box::after { content: ''; position: absolute; width: 15px; height: 15px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
          .toggle-box.on::after { transform: translateX(15px); }

          /* ── PERSON SECTION ───────────────────────────────────── */
          .person-section { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 36px 40px; margin-bottom: 20px; }
          .person-section-title {
            font-family: 'Playfair Display', serif; font-size: 13px; font-weight: 500;
            letter-spacing: 1.5px; text-transform: uppercase; color: var(--rose-light);
            margin-bottom: 28px; padding-bottom: 14px; border-bottom: 1px solid var(--gold-pale);
          }

          /* ── NAMENSWECHSEL ────────────────────────────────────── */
          .namechange-section { background: var(--gold-faint); border: 1px dashed var(--gold-pale); border-radius: 14px; padding: 24px 32px; margin-top: 20px; }
          .namechange-toggle { display: flex; align-items: center; gap: 12px; cursor: pointer; }
          .namechange-toggle-label { font-size: 12px; color: var(--muted); }
          .namechange-fields { margin-top: 24px; display: none; }
          .namechange-fields.open { display: block; }

          /* ── CHILD BLOCK ──────────────────────────────────────── */
          .child-block { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 36px 40px; margin-bottom: 18px; }
          .child-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
          .child-block-title { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--rose-light); }
          .btn-remove { background: transparent; border: none; color: var(--silver); cursor: pointer; font-size: 22px; padding: 0; line-height: 1; transition: color 0.2s; }
          .btn-remove:hover { color: var(--rose); }

          /* ── BUTTONS ──────────────────────────────────────────── */
          .form-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 52px; padding-top: 32px; border-top: 1px solid var(--gold-pale); }
          .btn-primary {
            background: var(--ink); border: none; color: var(--cream);
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2.5px; text-transform: uppercase;
            padding: 16px 48px; border-radius: 40px; cursor: pointer;
            transition: background 0.22s, transform 0.12s;
          }
          .btn-primary:hover { background: var(--rose); transform: translateY(-1px); }
          .btn-primary:disabled { opacity: 0.3; cursor: default; pointer-events: none; }
          .btn-primary.gold { background: var(--rose); box-shadow: 0 4px 20px rgba(158,84,114,0.22); }
          .btn-primary.gold:hover { background: var(--mauve); }
          .btn-back { background: transparent; border: none; color: var(--silver); font-family: 'Raleway', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 0; transition: color 0.2s; }
          .btn-back:hover { color: var(--rose); }
          .btn-add {
            background: transparent; border: 1px dashed var(--rose-light); color: var(--rose);
            font-family: 'Raleway', sans-serif; font-weight: 400; font-size: 10px;
            letter-spacing: 2px; text-transform: uppercase;
            padding: 14px 28px; border-radius: 10px; cursor: pointer;
            width: 100%; margin-top: 4px; margin-bottom: 4px; transition: background 0.2s;
          }
          .btn-add:hover { background: var(--rose-pale); border-style: solid; }

          /* ── LOADING ──────────────────────────────────────────── */
          #screen-loading { display: none; align-items: center; justify-content: center; min-height: calc(100vh - 68px); background: var(--cream); }
          #screen-loading.active { display: flex; }
          .loading-inner { text-align: center; max-width: 440px; padding: 60px; }
          .loading-symbol { font-size: 56px; color: var(--rose-light); display: block; animation: spin 12s linear infinite; margin-bottom: 36px; }
          @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          .loading-h { font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 400; color: var(--ink); margin-bottom: 14px; line-height: 1.2; }
          .loading-sub { font-family: 'Playfair Display', serif; font-style: italic; font-size: 17px; color: var(--muted); min-height: 28px; transition: opacity 0.4s; }
          .loading-sub.hidden { opacity: 0; }
          .loading-dots { display: flex; gap: 8px; justify-content: center; margin-top: 44px; }
          .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--rose-pale); animation: dp 1.6s ease-in-out infinite; }
          .dot:nth-child(2){animation-delay:0.3s} .dot:nth-child(3){animation-delay:0.6s}
          @keyframes dp { 0%,100%{background:var(--rose-pale);transform:scale(1)} 50%{background:var(--rose-light);transform:scale(1.4)} }

          /* ── RESULT ───────────────────────────────────────────── */
          #screen-result { min-height: calc(100vh - 68px); }
          .result-hero {
            background: linear-gradient(145deg, var(--paper-deep) 0%, var(--paper) 60%, var(--rose-pale) 100%);
            padding: 68px 56px; position: relative; overflow: hidden;
          }
          .result-hero::before { content: ''; position: absolute; top: -60px; right: -60px; width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(196,152,64,0.10) 0%, transparent 70%); }
          .result-hero-eyebrow { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 12px; font-weight: 400; }
          .result-hero-title { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 400; color: var(--ink); margin-bottom: 8px; }
          .result-hero-name { font-family: 'Playfair Display', serif; font-style: italic; font-size: 21px; color: var(--rose); }

          .result-content { max-width: 820px; margin: 0 auto; padding: 68px 56px 80px; }

          /* ── SECTION TITLES WITH INFO ─────────────────────────── */
          .result-section { margin-bottom: 52px; }
          .result-section-title-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--gold-pale); }
          .result-section-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 500; color: var(--rose); flex: 1; }
          .sec-info-btn {
            flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
            border: 1.5px solid var(--gold-pale); background: transparent;
            color: var(--silver); font-family: 'Georgia', serif; font-style: italic;
            font-size: 11px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            margin-top: 4px; transition: border-color 0.2s, color 0.2s, background 0.2s; line-height: 1;
          }
          .sec-info-btn:hover { border-color: var(--rose-light); color: var(--rose); background: var(--rose-pale); }
          .sec-info-panel {
            display: none; background: var(--rose-pale);
            border: 1px solid rgba(196,132,158,0.3); border-left: 3px solid var(--rose-light);
            border-radius: 10px; padding: 14px 18px;
            font-family: 'Raleway', sans-serif; font-size: 12.5px; font-weight: 300;
            color: var(--muted); line-height: 1.7; margin-bottom: 16px; letter-spacing: 0.1px;
          }
          .sec-info-panel.open { display: block; animation: fadeUp 0.25s ease forwards; }

          .result-text { font-family: 'Playfair Display', serif; font-size: 18px; line-height: 1.9; color: var(--ink); white-space: pre-wrap; }
          .result-body-inner { }
          .res-p { font-family: 'Playfair Display', serif; font-size: 18px; line-height: 1.9; color: var(--ink); margin-bottom: 14px; }

          .result-ornament { text-align: center; color: var(--rose-pale); font-size: 14px; letter-spacing: 16px; margin: 10px 0 52px; }
          .result-actions { background: var(--paper-deep); border-top: 1px solid var(--gold-pale); padding: 36px 56px; display: flex; align-items: center; gap: 24px; }
          .btn-ghost { background: transparent; border: none; color: var(--muted); font-family: 'Raleway', sans-serif; font-weight: 300; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 0; transition: color 0.2s; }
          .btn-ghost:hover { color: var(--rose); }
          .error-box { background: #fff5f5; border: 1px solid #f0c0c8; border-radius: 12px; padding: 22px 26px; color: var(--rose); font-size: 14px; line-height: 1.6; }

          /* ── RESULT COMPONENTS ────────────────────────────────── */
          .res-big-zahl { font-family: 'Playfair Display', serif; font-size: 96px; font-weight: 400; color: var(--rose); line-height: 1; margin: 14px 0 22px; letter-spacing: -3px; font-style: italic; }

          .res-person-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 20px 0; }
          .res-person-card { background: white; border: 1px solid var(--gold-pale); border-radius: 18px; padding: 28px; border-top: 3px solid var(--rose-light); }
          .res-pc-label { font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 6px; font-weight: 400; }
          .res-pc-zahl { font-family: 'Playfair Display', serif; font-size: 64px; font-weight: 400; color: var(--rose); line-height: 1; margin-bottom: 8px; font-style: italic; }
          .res-pc-datum { font-size: 11px; color: var(--silver); margin-bottom: 6px; }
          .res-pc-stern { font-size: 11px; color: var(--muted); margin-bottom: 14px; }
          .res-pc-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 14px; color: var(--ink); line-height: 1.65; margin-bottom: 18px; border-top: 1px solid var(--gold-pale); padding-top: 14px; }
          .res-pc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
          .res-pc-stat { background: var(--rose-pale); border-radius: 10px; padding: 10px 6px; text-align: center; }
          .res-pc-stat-val { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 400; color: var(--rose); line-height: 1; }
          .res-pc-stat-label { font-size: 7.5px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 4px; }

          .res-karten-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
          .res-karte { background: white; border: 1px solid var(--gold-pale); border-radius: 16px; padding: 26px; border-top: 3px solid var(--rose-light); }
          .res-karte-eyebrow { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 6px; font-weight: 400; }
          .res-karte-zahl { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 400; color: var(--rose); line-height: 1; margin-bottom: 8px; font-style: italic; }
          .res-karte-titel { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--ink); margin-bottom: 8px; }
          .res-karte-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 13px; color: var(--muted); line-height: 1.65; }

          .res-dynamik { background: var(--rose-pale); border: 1px solid rgba(196,132,158,0.3); border-radius: 18px; padding: 32px; margin: 18px 0; }
          .res-dyn-pole { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
          .res-dyn-pole-item { text-align: center; flex: 1; }
          .res-dyn-zahl { font-family: 'Playfair Display', serif; font-size: 60px; font-weight: 400; color: var(--rose); line-height: 1; font-style: italic; }
          .res-dyn-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-top: 8px; font-weight: 400; }
          .res-dyn-arrows { font-size: 26px; color: var(--rose-light); text-align: center; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
          .res-dyn-resonanz { font-size: 8.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose); font-weight: 400; }

          .res-astro-list { display: flex; flex-direction: column; gap: 0; margin: 14px 0; }
          .res-astro-item { display: grid; grid-template-columns: 44px 1fr; gap: 0; padding: 18px 0; border-bottom: 1px solid var(--gold-pale); align-items: start; }
          .res-astro-item:first-child { border-top: 1px solid var(--gold-pale); }
          .res-astro-symbol { font-size: 22px; color: var(--rose-light); padding-top: 2px; }
          .res-astro-titel { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 5px; font-weight: 400; }
          .res-astro-text { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--ink); line-height: 1.75; font-style: italic; }

          .res-hs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 14px 0; }
          .res-hs-col { background: white; border-radius: 16px; padding: 26px; border: 1px solid var(--gold-pale); }
          .res-hs-challenge { border-left: 3px solid var(--rose-light); }
          .res-hs-key { border-left: 3px solid var(--gold); }
          .res-hs-header { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; font-weight: 400; }
          .res-hs-item { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--ink); line-height: 1.65; margin-bottom: 10px; }

          .res-tabelle-wrap { overflow-x: auto; margin: 14px 0; border-radius: 14px; border: 1px solid var(--gold-pale); }
          .res-tabelle { width: 100%; border-collapse: collapse; font-family: 'Raleway', sans-serif; }
          .res-tabelle thead th { background: var(--mauve); color: white; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; padding: 14px 16px; text-align: left; font-weight: 400; }
          .res-tabelle tbody tr { border-bottom: 1px solid var(--gold-pale); }
          .res-tabelle tbody tr:last-child { border-bottom: none; }
          .res-tabelle tbody td { padding: 13px 16px; vertical-align: top; }
          .res-row-now { background: var(--rose-pale); }
          .res-jahr-cell { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 400; color: var(--rose); white-space: nowrap; font-style: italic; }
          .res-tab-zahl { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; color: var(--ink); display: block; }
          .res-tab-kw { font-size: 10px; color: var(--muted); display: block; margin-top: 2px; }

          .res-pinnacle { display: grid; grid-template-columns: 60px 1fr; gap: 0; padding: 18px 0; border-bottom: 1px solid var(--gold-pale); align-items: start; }
          .res-pin-zahl { font-family: 'Playfair Display', serif; font-size: 44px; font-weight: 400; color: var(--rose-pale); line-height: 1; padding-top: 4px; font-style: italic; }
          .res-pin-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; flex-wrap: wrap; }
          .res-pin-num { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); font-weight: 400; }
          .res-pin-zeit { font-size: 11px; color: var(--silver); }
          .res-pin-person { font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--rose); font-weight: 400; }
          .res-pin-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 16px; color: var(--ink); line-height: 1.7; }
          .res-pin-challenge { font-size: 11px; color: var(--rose-light); margin-top: 5px; }

          .res-namen-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
          .res-namen-card { background: white; border: 1px solid var(--gold-pale); border-radius: 16px; padding: 26px; border-top: 3px solid var(--rose-light); }
          .res-nc-name { font-family: 'Playfair Display', serif; font-size: 19px; color: var(--ink); margin-bottom: 2px; }
          .res-nc-rolle { font-size: 8.5px; letter-spacing: 2px; text-transform: uppercase; color: var(--rose-light); margin-bottom: 18px; font-weight: 400; }
          .res-nc-zahlen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }
          .res-nc-zahl-item { text-align: center; background: var(--rose-pale); border-radius: 10px; padding: 10px 5px; }
          .res-nc-z { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 400; color: var(--rose); line-height: 1; font-style: italic; }
          .res-nc-zl { font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); margin-top: 3px; font-weight: 400; }
          .res-nc-ll { font-size: 9.5px; color: var(--muted); margin-top: 2px; }
          .res-nc-desc { font-family: 'Playfair Display', serif; font-style: italic; font-size: 13px; color: var(--muted); line-height: 1.65; border-top: 1px solid var(--gold-pale); padding-top: 12px; }

          .res-essenz {
            font-family: 'Playfair Display', serif; font-style: italic;
            font-size: 24px; line-height: 1.75; color: var(--ink);
            text-align: center; padding: 44px 28px;
            background: linear-gradient(135deg, var(--rose-pale) 0%, var(--gold-faint) 100%);
            border-radius: 18px; border: 1px solid rgba(196,132,158,0.25); margin: 14px 0;
          }

          /* ── MOBILE ───────────────────────────────────────────── */
          @media (max-width: 860px) {
            .topnav { padding: 0 20px; }
            .nav-progress { display: none; }
            .hero { grid-template-columns: 1fr; }
            .hero-left { padding: 52px 28px 44px; }
            .hero-h1 { font-size: 52px; }
            .hero-right { padding: 44px 28px; border-left: none; border-top: 1px solid var(--gold-pale); }
            .form-page { padding: 44px 20px 68px; }
            .form-h2 { font-size: 36px; }
            .card-grid-2, .card-grid-2-3 { grid-template-columns: 1fr; }
            .field-row, .field-row-3 { grid-template-columns: 1fr; gap: 0; }
            .person-section { padding: 24px 20px; }
            .child-block { padding: 24px 20px; }
            .result-hero { padding: 44px 20px; }
            .result-hero-title { font-size: 36px; }
            .result-content { padding: 44px 20px 56px; }
            .result-actions { padding: 24px 20px; flex-direction: column; align-items: flex-start; }
            .form-footer { flex-direction: column-reverse; gap: 18px; align-items: flex-start; }
            .res-person-grid, .res-karten-grid, .res-hs-grid, .res-namen-grid { grid-template-columns: 1fr; }
            .res-big-zahl { font-size: 72px; }
            .res-dyn-pole { flex-direction: column; }
            .res-tabelle thead th, .res-tabelle tbody td { padding: 10px 12px; }
            .lead-wrap { padding: 32px 20px; }
            .lead-title { font-size: 36px; }
          }

          @media print {
            .topnav, .result-actions { display: none !important; }
            .result-content { padding: 20px; }
          }
        `}</style>
      </Head>

      {/* TOP NAV */}
      <nav className="topnav">
        <div className="nav-brand">
          <span className="nav-symbol">✦</span>
          <div>
            <span className="nav-name">Familien-Code</span>
            <span className="nav-by"> · von Susana</span>
          </div>
        </div>
        <div className="nav-progress" id="nav-progress"></div>
        <button className="nav-cta" id="nav-reset" style={{display:'none'}}>Neue Analyse</button>
      </nav>

      {/* SCREEN 0: SPLASH */}
      <div className="screen active" id="screen-splash">
        <div className="hero">
          <div className="hero-left">
            <div className="hero-left-inner">
              <div className="hero-eyebrow">herzbewegung · Numerologie & Astrologie</div>
              <span className="hero-symbol">✦</span>
              <h1 className="hero-h1">Familien-<br/><em>Code</em></h1>
              <div className="hero-rule"></div>
              <p className="hero-sub">Deine Seelenlandschaft in Zahlen und Zeichen — persönlich, präzise, tiefgehend.</p>
              <button className="hero-cta" id="hero-cta-btn">
                Analyse starten
                <span className="hero-cta-arrow">→</span>
              </button>
              <p className="hero-tagline">Für dich, dein/e Partner:in & deine Familie</p>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-features-title">Was diese Analyse umfasst</div>
            <div className="feature-list">
              {[
                ['01', 'Numerologie', 'Lebenszahl, Seelendrang, Persönlichkeit & Ausdruckskraft — aus Taufname und Geburtsdatum'],
                ['02', 'Astrologie', 'Sternzeichen, kosmische Verbindungen & astrologische Resonanzen im System'],
                ['03', 'Beziehungen', 'Dynamiken zwischen Partnern, Eltern & Kindern — das Familiensystem als Ganzes'],
                ['04', 'Jahresprognosen', 'Persönliche Jahresenergien, Pinnacles & Challenges 2025–2029'],
              ].map(([num, title, desc]) => (
                <div className="feature-item" key={num}>
                  <div className="feature-num">{num}</div>
                  <div className="feature-body">
                    <div className="feature-title">{title}</div>
                    <div className="feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hero-glossar">
              <div className="hero-glossar-title">Begriffe auf einen Blick</div>
              <div className="hero-glossar-grid">
                {[
                  ['Lebenszahl', 'Die wichtigste Zahl — errechnet aus dem vollständigen Geburtsdatum. Zeigt die Lebensaufgabe.'],
                  ['Seelendrang', 'Aus den Vokalen des Taufnamens. Was die Seele innerlich antreibt und ersehnt.'],
                  ['Persönlichkeit', 'Aus den Konsonanten. Wie man nach aussen wirkt — das erste Bild, das andere empfangen.'],
                  ['Ausdruckszahl', 'Alle Buchstaben des Namens. Das Gesamtpotenzial — was gelebt werden kann.'],
                  ['Persönliches Jahr', 'Jährlicher Energiezyklus von 1–9. Zeigt das Thema des laufenden Jahres.'],
                  ['Pinnacle', 'Längere Lebensphase (7–27 Jahre) mit spezifischer Energie und Lernaufgabe.'],
                  ['Challenge', 'Das Reibungsthema innerhalb eines Pinnacles — das Wachstumsfeld.'],
                  ['Meisterzahl', '11, 22 oder 33. Werden nicht reduziert — tragen erhöhtes Potenzial und erhöhte Anforderung.'],
                ].map(([term, def]) => (
                  <div className="hero-glossar-item" key={term}>
                    <div className="hero-glossar-term">{term}</div>
                    <div className="hero-glossar-def">{def}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCREEN LEAD: LEAD GATE */}
      <div className="screen" id="screen-lead">
        <div className="lead-wrap">
          <div className="lead-eyebrow">herzbewegung · Familien-Code</div>
          <h2 className="lead-title">Bevor wir beginnen</h2>
          <p className="lead-sub">Deine Analyse wird persönlich auf dich berechnet. Wo sollen wir sie hinschicken?</p>
          <div className="lead-field">
            <label className="lead-label">Vorname</label>
            <input className="lead-input" id="lead-name" type="text" placeholder="Dein Vorname" autoComplete="given-name" />
          </div>
          <div className="lead-field">
            <label className="lead-label">E-Mail-Adresse</label>
            <input className="lead-input" id="lead-email" type="email" placeholder="deine@email.com" autoComplete="email" />
          </div>
          <button className="lead-btn" id="btn-lead-next" disabled>
            Weiter zur Analyse →
          </button>
          <p className="lead-privacy">Deine Daten werden vertraulich behandelt und nicht an Dritte weitergegeben.</p>
        </div>
      </div>

      {/* SCREEN 1: KONSTELLATION */}
      <div className="screen" id="screen-constellation">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 1 von 6 · Konstellation</div>
            <h2 className="form-h2">Für wen ist diese Analyse?</h2>
            <p className="form-sub">Wähle deine Konstellation. Sie bestimmt Tiefe und Sektionen der Analyse.</p>
          </div>
          <div className="card-grid-2">
            {[
              ['solo', '✦', 'Nur für mich', 'Persönliche Einzelanalyse — Lebensweg, Seele, Namen-Energie & Jahresprognosen'],
              ['pair', '✦✦', 'Für mich & Partner:in', 'Beziehungsanalyse — Dynamik, astrologische Resonanz & Verbindungen zu zweit'],
              ['family', '✦✦✦', 'Für unsere Familie', 'Paar & Kinder — das vollständige Familiensystem mit allen Verbindungen'],
              ['solo_children', '✦◇', 'Für mich & mein/e Kind/er', 'Alleinerziehend — du und deine Kinder im Zentrum der Analyse'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary" id="btn-constellation-next" disabled>Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 2: PERSON 1 */}
      <div className="screen" id="screen-person1">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 2 von 6 · Deine Daten</div>
            <h2 className="form-h2">Du</h2>
            <p className="form-sub">Der vollständige Taufname — der Name, den du bei der Geburt erhalten hast — ist für die Numerologie entscheidend.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">Persönliche Angaben</div>
            <div id="person1-form"></div>
          </div>
          <div className="namechange-section">
            <div className="namechange-toggle" onClick={(e) => {
              const fields = e.currentTarget.parentElement.querySelector('.namechange-fields');
              if (fields) fields.classList.toggle('open');
            }}>
              <div className="toggle-box" id="nc-p1-toggle"></div>
              <span className="namechange-toggle-label">Ich habe meinen Namen geändert (z. B. nach Heirat)</span>
            </div>
            <div className="namechange-fields">
              <div className="field-row" style={{marginTop: '8px'}}>
                <div className="field-group">
                  <label className="field-label">Neuer Vorname</label>
                  <input className="field-input" id="p1-newname-first" placeholder="Neuer Vorname" />
                </div>
                <div className="field-group">
                  <label className="field-label">Neuer Nachname</label>
                  <input className="field-input" id="p1-newname-last" placeholder="Neuer Nachname" />
                </div>
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 3: PERSON 2 */}
      <div className="screen" id="screen-person2">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 3 von 6 · Partner:in</div>
            <h2 className="form-h2">Dein/e Partner:in</h2>
            <p className="form-sub">Auch hier ist der Taufname massgebend — der Name bei der Geburt, nicht der spätere Alltagsname.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">Angaben Partner:in</div>
            <div id="person2-form"></div>
          </div>
          <div className="namechange-section">
            <div className="namechange-toggle" onClick={(e) => {
              const fields = e.currentTarget.parentElement.querySelector('.namechange-fields');
              if (fields) fields.classList.toggle('open');
            }}>
              <div className="toggle-box" id="nc-p2-toggle"></div>
              <span className="namechange-toggle-label">Partner:in hat den Namen geändert (z. B. nach Heirat)</span>
            </div>
            <div className="namechange-fields">
              <div className="field-row" style={{marginTop: '8px'}}>
                <div className="field-group">
                  <label className="field-label">Neuer Vorname</label>
                  <input className="field-input" id="p2-newname-first" placeholder="Neuer Vorname" />
                </div>
                <div className="field-group">
                  <label className="field-label">Neuer Nachname</label>
                  <input className="field-input" id="p2-newname-last" placeholder="Neuer Nachname" />
                </div>
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 4: COUPLE */}
      <div className="screen" id="screen-couple">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 4 von 6 · Schlüsseldaten</div>
            <h2 className="form-h2">Eure Geschichte</h2>
            <p className="form-sub">Diese Daten fliessen als numerologische Energiepunkte in die Analyse ein. Beide Angaben sind vollständig optional.</p>
          </div>
          <div className="person-section">
            <div className="person-section-title">Gemeinsame Daten</div>
            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Kennenlernen (TT.MM.JJJJ)</label>
                <input className="field-input" id="meet-date" placeholder="Optional" />
                <div className="toggle-row" data-toggle-input="meet-date" data-toggle-id="no-meet">
                  <div className="toggle-box" id="no-meet"></div>
                  <span className="toggle-label">Datum unbekannt oder überspringen</span>
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">Hochzeit / Zusammenzug (TT.MM.JJJJ)</label>
                <input className="field-input" id="wedding-date" placeholder="Optional" />
                <div className="toggle-row" data-toggle-input="wedding-date" data-toggle-id="no-wedding">
                  <div className="toggle-box" id="no-wedding"></div>
                  <span className="toggle-label">Datum unbekannt oder überspringen</span>
                </div>
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 5: KINDER */}
      <div className="screen" id="screen-children">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 5 von 6 · Kinder</div>
            <h2 className="form-h2">Die Kinder</h2>
            <p className="form-sub">Bis zu 5 Kinder können erfasst werden. Die Geburtszeit ist optional, aber wertvoll für die Analyse.</p>
          </div>
          <div id="children-container"></div>
          <button className="btn-add" id="btn-add-child">+ Weiteres Kind hinzufügen</button>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary btn-next-generic">Weiter →</button>
          </div>
        </div>
      </div>

      {/* SCREEN 6: FOKUS */}
      <div className="screen" id="screen-focus">
        <div className="form-page">
          <div className="form-page-header">
            <div className="form-eyebrow">Schritt 6 von 6 · Fokus</div>
            <h2 className="form-h2">Was bewegt dich<br/>am meisten?</h2>
            <p className="form-sub">Wähle deinen Schwerpunkt. Die Analyse bleibt vollständig — dieser Fokus bestimmt, wo sie am tiefsten geht.</p>
          </div>
          <div className="card-grid-2-3">
            {[
              ['overview', '◎', 'Das grosse Gesamtbild', 'Alle Dimensionen — vollständige Tiefenanalyse'],
              ['relationship', '♡', 'Beziehungsdynamik', 'Verbindung, Resonanz & Partnerschaft'],
              ['personal', '◈', 'Persönlicher Lebensweg', 'Seele, Bestimmung & innere Kraft'],
              ['children_focus', '✧', 'Die Kinder', 'Seelenbild & Energien der Kinder'],
              ['future', '◬', 'Zukunft & Jahresprognosen', 'Energien & Pinnacles 2025–2029'],
            ].map(([value, icon, title, desc]) => (
              <div className="select-card" data-value={value} key={value}>
                <div className="card-top"><div className="card-icon">{icon}</div><div className="card-check">✓</div></div>
                <div className="card-title">{title}</div>
                <div className="card-desc">{desc}</div>
              </div>
            ))}
          </div>
          <div className="form-footer">
            <button className="btn-back">← Zurück</button>
            <button className="btn-primary gold" id="btn-focus-next" disabled>Analyse generieren ✦</button>
          </div>
        </div>
      </div>

      {/* SCREEN 7: LOADING */}
      <div className="screen" id="screen-loading">
        <div className="loading-inner">
          <span className="loading-symbol">✦</span>
          <div className="loading-h">Dein Code<br/>wird berechnet…</div>
          <div className="loading-sub" id="loading-sub">Lebenszahlen werden ermittelt…</div>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      </div>

      {/* SCREEN 8: RESULT */}
      <div className="screen" id="screen-result">
        <div className="result-hero">
          <div className="result-hero-eyebrow">herzbewegung · Familien-Code · Deine persönliche Analyse</div>
          <div className="result-hero-title">Deine Seelenlandschaft</div>
          <div className="result-hero-name" id="result-name"></div>
        </div>
        <div className="result-content" id="result-body"></div>
        <div className="result-actions">
          <button className="btn-primary" id="btn-print">↓ Als PDF speichern</button>
          <button className="btn-ghost" id="btn-reset-result">Neue Analyse starten</button>
        </div>
      </div>
    </>
  )
}
