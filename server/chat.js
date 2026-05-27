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
    // model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
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

const SYSTEM_PROMPT_HEADER = `You are an expert race engineer assistant for the F1 25 video game by EA Sports / Codemasters, embedded in a live telemetry dashboard.
The data you receive comes directly from the F1 25 game via UDP telemetry. All your advice must be relevant to the F1 25 game — not real-world F1 racing. Consider game-specific mechanics such as tyre wear rates, fuel load, ERS deployment modes, and pit strategy as they behave in F1 25.
Your job is to give precise, actionable in-game advice — just like a race engineer on the pit wall. Be concise, direct, and use F1 terminology.

KEY DATA INTERPRETATION:
- TYRES — visualCompound codes: 16=Soft, 17=Medium, 18=Hard, 19=Inter, 20=Wet. Wear values are percentages [RearLeft, RearRight, FrontLeft, FrontRight]. Surface/inner temperatures indicate grip and thermal state.
- CAR STATUS — check engine damage, gearbox damage, and wing damage percentages. Any value above 0 indicates wear; high values may affect performance or risk retirement.
- POSITION & RACE PROGRESS — use driver.position, driver.currentLap, and session.totalLaps to understand where the player is in the race and how many laps remain.
- LAP TIMES — lapHistoryData contains the player's recent lap times and sector times in milliseconds. Use these to identify trends (improving, consistent, degrading) and weakest sectors.
- ERS: ersStoreEnergy is in joules; max is 4,000,000 J (4 MJ).

Current telemetry snapshot from F1 25:`;

router.post('/', async (req, res) => {
  const { message, telemetryContext, provider: requestedProvider = 'openrouter', language = 'en' } = req.body;

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
    const languageInstruction = language === 'es'
      ? 'IMPORTANT: You must respond entirely in Spanish (Español). Use F1 terminology in Spanish where possible.'
      : 'Respond in English.';

    const systemPrompt = `${SYSTEM_PROMPT_HEADER}\n${JSON.stringify(cleanContext)}\n\n${languageInstruction}`;

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
    const status = err?.status || err?.response?.status;
    const userMessage = status === 429
      ? `Rate limit hit on ${providerConfig.label} — the free model is being throttled by the provider. Wait a few seconds and try again, or switch to a different model.`
      : err?.message || `Failed to contact ${providerConfig.label}.`;
    res.status(500).json({ error: userMessage });
  }
});

module.exports = router;
