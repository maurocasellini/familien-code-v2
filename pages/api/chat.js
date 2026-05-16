import { Redis } from '@upstash/redis';

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lead, language } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // ── LANGUAGE-AWARE SYSTEM PROMPT ───────────────────────────────
  const lang = (language === 'en' || language === 'pt') ? language : 'de';
  const systemPrompts = {
    de: 'Du bist eine erfahrene Astrologin und Numerologin. Schreibe AUSSCHLIESSLICH in Schweizer Hochdeutsch: KEIN scharfes S (kein ß) -- schreibe immer ss statt ß. Also: "muss" statt "muß", "gross" statt "groß", "weiss" statt "weiß", "Strasse" statt "Straße", "heisst" statt "heißt", "Schluss", "Fluss", "Schloss", "Spass". Diese Regel gilt fuer JEDES Wort, JEDEN Satz, JEDE Sektion -- ohne Ausnahme. Schreibe tief, persoenlich und konkret. Jede Analyse soll sich wie ein persoenliches Gespraech anfuehlen. Sei grosszuegig mit Laenge und Detail.',
    en: 'You are an experienced astrologer and numerologist. Write ENTIRELY in English (modern, natural, warm — neither stiff nor academic). Use the informal "you". Write deeply, personally, and concretely. Each analysis should feel like a personal conversation. Be generous with length and detail. Keep section titles in English. Keep all structural markers like [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exactly as they are — they are technical tags, not translated content. But inside those tags, the human-readable parts (labels, descriptions, keywords) should be in English.',
    pt: 'Você é uma astróloga e numeróloga experiente. Escreva INTEIRAMENTE em português (português europeu preferencialmente, mas natural e caloroso). Use "tu" / forma informal. Escreva de forma profunda, pessoal e concreta. Cada análise deve parecer uma conversa pessoal. Seja generosa com a extensão e os detalhes. Mantenha os títulos das secções em português. Mantenha todos os marcadores estruturais como [ZAHL:11], [PERSON-CARD:...], [NAMEN-GRID-START] exatamente como estão — são etiquetas técnicas, não conteúdo traduzido. Mas dentro dessas etiquetas, as partes legíveis (rótulos, descrições, palavras-chave) devem estar em português.',
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

  // ── ANTHROPIC API ──────────────────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8192,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}

