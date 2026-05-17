import { Redis } from '@upstash/redis';

// Node-internal undici → fetch dispatcher mit langen Timeouts.
// Default headers-timeout in Node ist 300s; bei 32K-Token-Generation reicht das nicht.
// Wir nehmen 15 Min — passt fuer lokale Volltiefe-Analysen.
let longDispatcher = null;
function getLongDispatcher() {
  if (longDispatcher) return longDispatcher;
  try {
    const { Agent } = require('undici');
    longDispatcher = new Agent({
      headersTimeout: 15 * 60 * 1000, // 15 Min
      bodyTimeout: 15 * 60 * 1000,
      connectTimeout: 60 * 1000,      // 60s fuer TLS-Handshake
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
    de: 'Du bist eine erfahrene Astrologin und Numerologin. Schreibe AUSSCHLIESSLICH in Schweizer Hochdeutsch.\n\nUMLAUTE: Verwende Umlaute ä ö ü Ä Ö Ü ganz normal! Beispiele: "natürlich", "für", "Länge", "Sätze", "persönlich", "Wörter", "über", "Größe" (ohne ß!), "Gefühl". NICHT "fuer", NICHT "Laenge", NICHT "persoenlich". Schreibe alle deutschen Wörter mit korrekten Umlauten.\n\nSCHARFES S: KEIN ß verwenden. Schreibe immer ss statt ß. Also: "muss" statt "muß", "gross" statt "groß", "weiss" statt "weiß", "Strasse" statt "Straße", "heisst" statt "heißt", "Schluss", "Fluss", "Schloss", "Spass", "grösste" (mit Umlaut UND ss!). Diese Regel gilt für JEDES Wort.\n\nSTIL: Schreibe natürlich, warm und persönlich, NICHT wie eine KI. KEINE Gedankenstriche (kein — kein –), verwende stattdessen Kommas, Doppelpunkte oder kurze Sätze. Vermeide jegliche Em-Dashes und En-Dashes. Bindestriche in zusammengesetzten Wörtern (Familien-Code, Lebens-Aufgabe) sind OK, das sind normale Hyphens. Aber NIEMALS einen Gedankenstrich als Satzzeichen wie in "Maria, das Sternbild, das alles verändert hat" (richtig) statt "Maria — das Sternbild — das alles verändert hat" (FALSCH).\n\nINHALT: Schreibe tief, persönlich und konkret. Jede Analyse soll sich wie ein persönliches Gespräch anfühlen.',
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
        system: systemPrompt + depthInstruction + (isVercel ? '\n\nWICHTIG: Halte dich KURZ und KOMPAKT. Diese Demo-Umgebung hat ein 60-Sekunden-Limit. Schreibe pro Sektion maximal 500 Woerter. Die volle Tiefe gibts in der lokalen Version.' : ''),
        messages,
      }),
    };
    // Lokal: long-timeout dispatcher anhaengen damit Headers-Timeout nicht bei 5min triggert
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
    return res.status(200).json(data);
  } catch (err) {
    // Detaillierter Fehler in Server-Logs (Terminal von npm run electron:dev)
    console.error('[chat] Fetch failed. Full error:', err);
    console.error('[chat] err.cause:', err.cause);
    console.error('[chat] err.code:', err.code);
    const detail = err.cause?.message || err.cause?.code || err.code || 'unbekannt';
    return res.status(500).json({
      error: {
        message: `${err.message} (Detail: ${detail}). Bitte schau in der Terminal-Konsole nach dem genauen Fehler. Haeufige Ursachen: Internet nicht erreichbar, falscher API-Key, oder API-Key fehlt in .env.local.`,
        original: err.message,
        cause: err.cause?.message || err.cause?.code || null,
      }
    });
  }
}

