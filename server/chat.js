const { Router } = require('express');
const OpenAI = require('openai');

const router = Router();

const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    model: 'gpt-4o-mini',
    getClient: () => {
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set in server/.env');
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    },
  },
  openrouter: {
    label: 'OpenRouter',
    model: 'google/gemini-2.0-flash-001',
    getClient: () => {
      if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set in server/.env');
      return new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'F1 Race Engineer AI',
        },
      });
    },
  },
};

const SYSTEM_PROMPT_HEADER = `You are an expert F1 race engineer assistant embedded in a live telemetry dashboard.
You have access to real-time data from the player's car during a Formula 1 session.
Your job is to give precise, actionable race strategy and performance advice — just like a real race engineer on the pit wall.
Be concise, direct, and use F1 terminology. When recommending tyres, always explain WHY based on the data.

TYRE COMPOUND CODES: 16=Soft, 17=Medium, 18=Hard, 19=Inter, 20=Wet.

Important information: All this telemetry comes from the F1 25 game so all your answers should be based on that.

Current telemetry snapshot:`;

router.post('/', async (req, res) => {
  const { message, telemetryContext, provider: requestedProvider = 'openai' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "message" field.' });
  }

  const providerConfig = PROVIDERS[requestedProvider];
  if (!providerConfig) {
    return res.status(400).json({ error: `Unknown provider "${requestedProvider}". Use "openai" or "openrouter".` });
  }

  let client;
  try {
    client = providerConfig.getClient();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const cleanContext = JSON.parse(
      JSON.stringify(telemetryContext ?? {}, (_, v) => (v == null ? undefined : v))
    );
    const systemPrompt = `${SYSTEM_PROMPT_HEADER}\n${JSON.stringify(cleanContext)}`;

    const response = await client.chat.completions.create({
      model: providerConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({ reply: response.choices[0].message.content, provider: requestedProvider });
  } catch (err) {
    console.error(`[chat] ${providerConfig.label} error:`, err?.message || err);
    res.status(500).json({ error: err?.message || `Failed to contact ${providerConfig.label}.` });
  }
});

module.exports = router;
