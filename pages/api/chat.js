import { Redis } from '@upstash/redis';

// Node-internal undici → fetch dispatcher mit langen Timeouts.
// Default headers-timeout in Node ist 300s; bei 32K-Token-Generation reicht das nicht.
// Wir nehmen 15 Min — passt für lokale Volltiefe-Analysen.
let longDispatcher = null;
function getLongDispatcher() {
  if (longDispatcher) return longDispatcher;
  try {
    const { Agent } = require('undici');
    longDispatcher = new Agent({
      headersTimeout: 15 * 60 * 1000, // 15 Min
      bodyTimeout: 15 * 60 * 1000,
      connectTimeout: 60 * 1000,      // 60s für TLS-Handshake
    });
  } catch (e) {
    console.error('[chat] undici Agent nicht verfuegbar:', e.message);
  }
  return longDispatcher;
}

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lead, language, depth } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // ── LANGUAGE-AWARE SYSTEM PROMPT ───────────────────────────────
  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const systemPrompts = {
    de: 'Du bist eine erfahrene Astrologin, Numerologin und CROWLEY-THOTH-Tarot-Lehrerin. Schreibe AUSSCHLIESSLICH in Schweizer Hochdeutsch.\n\nUMLAUTE: Verwende Umlaute ä ö ü Ä Ö Ü ganz normal! Beispiele: "natürlich", "für", "Länge", "Sätze", "persönlich", "Wörter", "über", "Größe" (ohne ß!), "Gefühl". Schreibe alle deutschen Wörter mit korrekten Umlauten.\n\nSCHARFES S: KEIN ß verwenden. Schreibe immer ss statt ß. Also: "muss", "gross", "weiss", "Strasse", "heisst", "Schluss", "Fluss", "Schloss", "Spass", "grösste".\n\nSTIL: Schreibe natürlich, warm und persönlich, NICHT wie eine KI. KEINE Gedankenstriche (kein — kein –), verwende stattdessen Kommas, Doppelpunkte oder kurze Sätze. Bindestriche in zusammengesetzten Wörtern sind OK.\n\n══ CROWLEY THOTH TAROT — METHODISCHE GRUNDLAGE ══\nDiese Analyse arbeitet AUSSCHLIESSLICH mit Aleister Crowleys Thoth-Tarot (NICHT Rider-Waite). Du integrierst die Tarot-Karten als bedeutungsvolle Schicht der Analyse, nicht als reine Numerologie.\n\nWICHTIG bei Karten-Namen — Crowley unterscheidet sich von Rider-Waite:\n• 1 = Der Magus (NICHT The Magician)\n• 8 = Adjustment (NICHT Strength / Stärke). Crowley hat 8 und 11 vertauscht aus kabbalistischen Gründen.\n• 11 = Lust (NICHT Justice / Gerechtigkeit)\n• 14 = Art / Kunst (NICHT Temperance / Mässigung). Bei Crowley ist es eine alchemistische Karte: Vereinigung der Gegensätze im Kessel.\n• 20 = Das Äon (NICHT Judgement / Gericht). Bei Crowley: Neuzeitalter, Krönung des Horus.\n• 21 = Das Universum (NICHT The World / Welt). Bei Crowley umfassender, Saturn als Schwellenhüter zur Ganzheit.\n\nBerechnungsmethode: TT + MM + JJJJ als Block-Summe (Tarot-Methode), nicht Ziffer-für-Ziffer. Die Zwischensumme (≤22) ergibt die ERSTE Karte (Prozess/Weg), die finale Reduktion auf 1-9 ergibt die ZWEITE Karte (Ziel/Kern). Beispiel: 17 + 5 + 2026 = 2048 → 14 → 5. Karte 14 = Art (Prozess), Karte 5 = Hierophant (Ziel).\n\nIn der Analyse: Bei Lebenszahl, Persönlichem Jahr, Pinnacles, Geburtszahl — überall wo eine Zahl auftaucht — nenne BEIDE Karten (Zwischen + End) und erkläre sie aus der Crowley-Tradition. Die Zwischenkarte ist der WEG, die Endkarte ist das ZIEL. Beide werden gleichberechtigt gelesen.\n\nDie Karten-Daten (Name, Essenz, Licht, Schatten) bekommst du im User-Prompt mitgeliefert. Verwende sie als Grundlage für deine Interpretation, vertiefe und kontextualisiere sie für die spezifische Person.\n\nINHALT: Schreibe tief, persönlich und konkret. Jede Analyse soll sich wie ein persönliches Gespräch mit einer erfahrenen Crowley-Tarot-Numerologin anfühlen.',
    en: 'You are an experienced astrologer and numerologist. Write ENTIRELY in English (modern, natural, warm, neither stiff nor academic). Use the informal "you".\n\nSTYLE: Write naturally and personally, NOT like an AI. NO em-dashes (no —) and NO en-dashes (no –). Use commas, colons, or short sentences instead. Hyphens in compound words (Family-Code, soul-path) are fine. But NEVER a dash as punctuation. Example: "Maria, the star sign that changed everything," (correct) instead of "Maria — the star sign that changed everything —" (WRONG).\n\nCONTENT: Write deeply, personally, and concretely. Each analysis should feel like a personal conversation. Be generous with length and detail.\n\nKeep all structural markers like [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exactly as they are. But inside those tags, content (labels, descriptions, keywords) should be in English.',
    pt: 'És uma astróloga e numeróloga experiente. Escreve INTEIRAMENTE em português (preferencialmente europeu, mas natural e caloroso). Usa a forma informal "tu".\n\nESTILO: Escreve de forma natural e pessoal, NÃO como uma IA. SEM travessões (sem — e sem –). Usa vírgulas, dois-pontos ou frases curtas em vez disso. Hífenes em palavras compostas (Código-Familiar, vida-alma) estão bem. Mas NUNCA um travessão como pontuação. Exemplo: "Maria, o signo que mudou tudo," (correto) em vez de "Maria — o signo que mudou tudo —" (ERRADO).\n\nCONTEÚDO: Escreve de forma profunda, pessoal e concreta. Cada análise deve parecer uma conversa pessoal. Sê generosa com a extensão e os detalhes.\n\nMantém os marcadores estruturais como [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exatamente como estão. Mas dentro dessas etiquetas, o conteúdo (rótulos, descrições, palavras-chave) deve estar em português.',
  };
  const systemPrompt = systemPrompts[lang];

  // ── SAVE LEAD TO REDIS ─────────────────────────────────────────
  if (lead?.email) {
    try {
      const redis = getRedis();
      if (redis) {
        const id = `lead:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
        const record = JSON.stringify({
          id,
          name: lead.name || '',
          email: lead.email || '',
          constellation: lead.constellation || '',
          focus: lead.focus || '',
          language: lang,
          timestamp: new Date().toISOString(),
        });
        await redis.set(id, record);
        await redis.lpush('leads', id);
      }
    } catch (err) {
      console.error('Redis save error:', err.message);
    }
  }

  // Vercel Hobby hat 60s Timeout. Lokal: unbegrenzt.
  // max_tokens skaliert mit gewünschter Detailtiefe (Zielseiten):
  //   5 Seiten  ≈ 3000 Tokens    15 Seiten ≈ 9000 Tokens
  //   25 Seiten ≈ 16000 Tokens   40 Seiten ≈ 28000 Tokens
  // Faustregel: ~600 tokens pro Zielseite + Overhead.
  const isVercel = process.env.VERCEL === '1';
  const targetDepth = Math.max(5, Math.min(40, parseInt(depth, 10) || 15));
  const localMaxTokens = Math.min(32000, Math.max(2500, targetDepth * 700 + 1000));
  const maxTokens = isVercel ? Math.min(8000, localMaxTokens) : localMaxTokens;
  const depthInstruction = `\n\nDETAILTIEFE: Diese Analyse soll etwa ${targetDepth} A4-Seiten Umfang haben. ${targetDepth <= 8 ? 'KOMPAKT: konzentrier dich auf das Wesentliche, kürzere Sektionen.' : targetDepth <= 18 ? 'MITTEL: jede Sektion gut ausgeführt, aber nicht überladen.' : targetDepth <= 28 ? 'TIEF: jede Sektion ausführlich behandeln, Beispiele und Anwendungen.' : 'PROFI-MAXIMUM: maximale Tiefe pro Sektion, alle Aspekte ausschöpfen, viele Beispiele und konkrete Anwendungen.'} Stimme die Sektionslängen auf dieses Ziel ab.`;

  // ── ANTHROPIC API ──────────────────────────────────────────────
  try {
    console.log('[chat] Calling Anthropic API. Key present:', !!process.env.ANTHROPIC_API_KEY, 'Key prefix:', process.env.ANTHROPIC_API_KEY?.slice(0, 12));
    const fetchOpts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: maxTokens,
        system: systemPrompt + depthInstruction + (isVercel ? '\n\nWICHTIG: Halte dich KURZ und KOMPAKT. Diese Demo-Umgebung hat ein 60-Sekunden-Limit. Schreibe pro Sektion maximal 500 Wörter. Die volle Tiefe gibts in der lokalen Version.' : ''),
        messages,
      }),
    };
    // Lokal: long-timeout dispatcher anhängen damit Headers-Timeout nicht bei 5min triggert
    if (!isVercel) {
      const disp = getLongDispatcher();
      if (disp) fetchOpts.dispatcher = disp;
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', fetchOpts);

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try { errorJson = JSON.parse(errorText); } catch (e) { errorJson = { error: { message: errorText } }; }
      console.error('[chat] Anthropic returned non-OK status', response.status, errorJson);
      return res.status(response.status).json(errorJson);
    }

    const data = await response.json();

    // Defensive Umlaut-Korrektur: falls Claude trotz System-Prompt einzelne Wörter
    // ohne Umlaute ausspuckt (ueber, fuer, Saetze, etc.), korrigiere sie hier.
    // Nur fürs DE-Output, EN/PT bleiben unangetastet.
    if ((language === 'de' || !language) && data.content && Array.isArray(data.content)) {
      const umlautMap = [
        // Längere Strings zuerst (sonst überschreiben kürzere falsch)
        [/\bUebernaechstes\b/g, 'Übernächstes'], [/\buebernaechstes\b/g, 'übernächstes'],
        [/\bUebernaechste\b/g, 'Übernächste'], [/\buebernaechste\b/g, 'übernächste'],
        [/\bAusfuehrlich\b/g, 'Ausführlich'], [/\bausfuehrlich\b/g, 'ausführlich'],
        [/\bAusfuehrung\b/g, 'Ausführung'], [/\bausfuehrung\b/g, 'ausführung'],
        [/\bPersoenlichkeit\b/g, 'Persönlichkeit'], [/\bpersoenlichkeit\b/g, 'persönlichkeit'],
        [/\bPersoenliche\b/g, 'Persönliche'], [/\bpersoenliche\b/g, 'persönliche'],
        [/\bPersoenlicher\b/g, 'Persönlicher'], [/\bpersoenlicher\b/g, 'persönlicher'],
        [/\bPersoenliches\b/g, 'Persönliches'], [/\bpersoenliches\b/g, 'persönliches'],
        [/\bpersoenlich\b/g, 'persönlich'], [/\bPersoenlich\b/g, 'Persönlich'],
        [/\bnatuerlich\b/g, 'natürlich'], [/\bNatuerlich\b/g, 'Natürlich'],
        [/\bSuedknoten\b/g, 'Südknoten'], [/\bsuedknoten\b/g, 'südknoten'],
        [/\bNordknoten\b/g, 'Nordknoten'],
        [/\bSchuetze\b/g, 'Schütze'], [/\bschuetze\b/g, 'schütze'],
        [/\bLoewe\b/g, 'Löwe'], [/\bloewe\b/g, 'löwe'],
        [/\bSchluessel\b/g, 'Schlüssel'], [/\bschluessel\b/g, 'schlüssel'],
        [/\bGespraech\b/g, 'Gespräch'], [/\bgespraech\b/g, 'gespräch'],
        [/\bGespraeche\b/g, 'Gespräche'], [/\bgespraeche\b/g, 'gespräche'],
        [/\bGefuehl\b/g, 'Gefühl'], [/\bgefuehl\b/g, 'gefühl'],
        [/\bGefuehle\b/g, 'Gefühle'], [/\bgefuehle\b/g, 'gefühle'],
        [/\bSaetze\b/g, 'Sätze'], [/\bsaetze\b/g, 'sätze'],
        [/\bWoerter\b/g, 'Wörter'], [/\bwoerter\b/g, 'wörter'],
        [/\bWoertern\b/g, 'Wörtern'], [/\bwoertern\b/g, 'wörtern'],
        [/\bWaehrend\b/g, 'Während'], [/\bwaehrend\b/g, 'während'],
        [/\bSchoenheit\b/g, 'Schönheit'], [/\bschoenheit\b/g, 'schönheit'],
        [/\bschoen\b/g, 'schön'], [/\bSchoen\b/g, 'Schön'],
        [/\bMaedchen\b/g, 'Mädchen'], [/\bmaedchen\b/g, 'mädchen'],
        [/\bBuecher\b/g, 'Bücher'], [/\bbuecher\b/g, 'bücher'],
        [/\bMaerz\b/g, 'März'],
        [/\bGlueck\b/g, 'Glück'], [/\bglueck\b/g, 'glück'],
        [/\bgluecklich\b/g, 'glücklich'], [/\bGluecklich\b/g, 'Glücklich'],
        [/\bSchaetze\b/g, 'Schätze'], [/\bschaetze\b/g, 'schätze'],
        [/\bspueren\b/g, 'spüren'], [/\bspuerst\b/g, 'spürst'],
        [/\bspuert\b/g, 'spürt'], [/\bgespuert\b/g, 'gespürt'],
        [/\bpraezise\b/g, 'präzise'], [/\bPraezise\b/g, 'Präzise'],
        [/\berklaeren\b/g, 'erklären'], [/\bErklaeren\b/g, 'Erklären'],
        [/\bErklaerung\b/g, 'Erklärung'], [/\berklaerung\b/g, 'erklärung'],
        [/\bAnnaeherung\b/g, 'Annäherung'], [/\bannaeherung\b/g, 'annäherung'],
        [/\bAende/g, 'Ände'], [/\baende/g, 'ände'],
        [/\bgehoert\b/g, 'gehört'], [/\bGehoert\b/g, 'Gehört'],
        [/\bberueck/g, 'berück'], [/\bBerueck/g, 'Berück'],
        [/\bberuehr/g, 'berühr'], [/\bBeruehr/g, 'Berühr'],
        [/\bdurchgaengig\b/g, 'durchgängig'],
        [/\bnaechste\b/g, 'nächste'], [/\bNaechste\b/g, 'Nächste'],
        [/\bnaechster\b/g, 'nächster'], [/\bNaechster\b/g, 'Nächster'],
        [/\bnaechsten\b/g, 'nächsten'],
        [/\bzurueck\b/g, 'zurück'], [/\bZurueck\b/g, 'Zurück'],
        [/\bfuehrt\b/g, 'führt'], [/\bgefuehrt\b/g, 'geführt'],
        [/\bfuehren\b/g, 'führen'], [/\bgefuehren\b/g, 'geführen'],
        [/\bfuehlt\b/g, 'fühlt'], [/\bfuehl/g, 'fühl'],
        [/\bFuehl/g, 'Fühl'],
        [/\baussen\b/g, 'aussen'],
        [/\baeusser/g, 'äusser'], [/\bAeusser/g, 'Äusser'],
        [/\baehnlich\b/g, 'ähnlich'], [/\bAehnlich\b/g, 'Ähnlich'],
        [/\baehnliche\b/g, 'ähnliche'], [/\bAehnliche\b/g, 'Ähnliche'],
        [/\bunterstuetz/g, 'unterstütz'], [/\bUnterstuetz/g, 'Unterstütz'],
        [/\bmoechte\b/g, 'möchte'], [/\bMoechte\b/g, 'Möchte'],
        [/\bmoeglich\b/g, 'möglich'], [/\bMoeglich\b/g, 'Möglich'],
        [/\bmoeglicher\b/g, 'möglicher'], [/\bmoeglichkeit\b/g, 'möglichkeit'],
        [/\bMoeglichkeit\b/g, 'Möglichkeit'],
        [/\bAbsaetze\b/g, 'Absätze'], [/\babsaetze\b/g, 'absätze'],
        [/\bBloecke\b/g, 'Blöcke'], [/\bbloecke\b/g, 'blöcke'],
        [/\bUebersicht\b/g, 'Übersicht'], [/\buebersicht\b/g, 'übersicht'],
        [/\bUebung\b/g, 'Übung'], [/\buebung\b/g, 'übung'],
        [/\bUeber\b/g, 'Über'], [/\bueber\b/g, 'über'],
        // letzten: kurze Wörter (jetzt wo längere alle ersetzt sind)
        [/\bFuer\b/g, 'Für'], [/\bfuer\b/g, 'für'],
        [/\bLaenge\b/g, 'Länge'], [/\blaenge\b/g, 'länge'],
        [/\blaenger\b/g, 'länger'], [/\bLaenger\b/g, 'Länger'],
        [/\bMaennlich\b/g, 'Männlich'], [/\bmaennlich\b/g, 'männlich'],
        [/\bweiblich\b/g, 'weiblich'],
      ];
      const fixUmlauts = (s) => {
        let t = String(s || '');
        for (const [re, rep] of umlautMap) t = t.replace(re, rep);
        return t;
      };
      data.content = data.content.map(block => {
        if (block && block.type === 'text' && typeof block.text === 'string') {
          return { ...block, text: fixUmlauts(block.text) };
        }
        return block;
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    // Detaillierter Fehler in Server-Logs (Terminal von npm run electron:dev)
    console.error('[chat] Fetch failed. Full error:', err);
    console.error('[chat] err.cause:', err.cause);
    console.error('[chat] err.code:', err.code);
    const detail = err.cause?.message || err.cause?.code || err.code || 'unbekannt';
    return res.status(500).json({
      error: {
        message: `${err.message} (Detail: ${detail}). Bitte schau in der Terminal-Konsole nach dem genauen Fehler. Häufige Ursachen: Internet nicht erreichbar, falscher API-Key, oder API-Key fehlt in .env.local.`,
        original: err.message,
        cause: err.cause?.message || err.cause?.code || null,
      }
    });
  }
}

