import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

// Web Speech API types (not in default TS lib)
interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}
interface ISpeechRecognitionResultList {
  readonly length: number;
  readonly resultIndex: number;
  [index: number]: ISpeechRecognitionResult;
}
interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((e: Event) => void) | null;
  onend: ((e: Event) => void) | null;
  onerror: ((e: Event) => void) | null;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
}
declare const webkitSpeechRecognition: new () => ISpeechRecognition;

type Provider = 'openai' | 'openrouter';
type Language = 'en' | 'es';

const PROVIDER_CONFIG: Record<Provider, { badge: string; color: string }> = {
  openai:     { badge: 'GPT-4o mini', color: '#10a37f' },
  openrouter: { badge: 'OpenRouter',  color: '#6366f1' },
};

const LANGUAGE_CONFIG: Record<Language, { label: string; sttLang: string; ttsLang: string }> = {
  en: { label: '🇬🇧 EN', sttLang: 'en-US', ttsLang: 'en-GB' },
  es: { label: '🇪🇸 ES', sttLang: 'es-ES', ttsLang: 'es-ES' },
};

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface AIChatWidgetProps {
  telemetryContext: object;
}

const SUGGESTED_QUESTIONS: Record<Language, string[]> = {
  en: [
    'Where do I need to improve?',
    'Should I pit now?',
    'Which tyres should I use for the pit?',
    'How is my car handling?',
    'Am I pushing too hard on the brakes?',
  ],
  es: [
    '¿Dónde debo mejorar?',
    '¿Debo entrar a boxes ahora?',
    '¿Qué neumáticos usar en el pit stop?',
    '¿Cómo está respondiendo el coche?',
    '¿Estoy frenando demasiado fuerte?',
  ],
};

const SOCKET_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : `http://${window.location.hostname}:3000`;

// Strips markdown bold/italic/headers so TTS sounds natural
const stripMarkdown = (text: string) =>
  text.replace(/[*_#`>]/g, '').replace(/\n+/g, ' ').trim();

// F1 speech recognition corrections — browser STT mangles racing terms
const F1_CORRECTIONS: Record<Language, [RegExp, string][]> = {
  en: [
    [/\bvox\b/gi, 'box'],
    [/\bvocks\b/gi, 'box'],
    [/\bpox\b/gi, 'box'],
    [/\bblocks\b/gi, 'box'],
    [/\bears\b/gi, 'ERS'],
    [/\burs\b/gi, 'ERS'],
    [/\bd\.?r\.?s\.?\b/gi, 'DRS'],
    [/\btyres?\b/gi, 'tyres'],
    [/\btires?\b/gi, 'tyres'],
    [/\binters?\b/gi, 'intermediates'],
    [/\bunder ?cut\b/gi, 'undercut'],
    [/\bover ?cut\b/gi, 'overcut'],
    [/\bpit ?stop\b/gi, 'pit stop'],
    [/\bsafe ?ty car\b/gi, 'safety car'],
    [/\bvsc\b/gi, 'VSC'],
  ],
  es: [
    [/\bvox\b/gi, 'box'],
    [/\bvocks\b/gi, 'box'],
    [/\bbok\b/gi, 'box'],
    [/\bbocks\b/gi, 'box'],
    [/\bboxes\b/gi, 'boxes'],
    [/\bears\b/gi, 'ERS'],
    [/\burs\b/gi, 'ERS'],
    [/\bd\.?r\.?s\.?\b/gi, 'DRS'],
    [/\bneumáticos?\b/gi, 'neumáticos'],
    [/\bintermedios?\b/gi, 'intermedios'],
    [/\bpit ?stop\b/gi, 'pit stop'],
    [/\bseguridad\b/gi, 'safety car'],
    [/\bvsc\b/gi, 'VSC'],
    [/\bsubcorte\b/gi, 'undercut'],
    [/\bsobrecorte\b/gi, 'overcut'],
  ],
};

const correctF1Terms = (text: string, lang: Language): string =>
  F1_CORRECTIONS[lang].reduce((t, [pattern, replacement]) => t.replace(pattern, replacement), text);

const GREETINGS: Record<Language, string> = {
  en: "Race engineer online. Ask me anything about your session — strategy, tyres, performance, anything.",
  es: "Ingeniero de pista en línea. Pregúntame lo que quieras sobre tu sesión — estrategia, neumáticos, rendimiento, lo que sea.",
};

export default function AIChatWidget({ telemetryContext }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('openrouter');
  const [language, setLanguage] = useState<Language>('es');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: GREETINGS['es'] }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

  // Voice
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Update greeting message when language changes (only if conversation hasn't started)
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages(prev => {
        if (prev.length === 1 && Object.values(GREETINGS).includes(prev[0].text)) {
          return [{ role: 'ai', text: GREETINGS[language] }];
        }
        return prev;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [language]);

  // Load voices and auto-select Google voice for the current language
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      setAvailableVoices(voices);
      // Auto-select Google voice if not already overridden by user
      setSelectedVoiceName(prev => {
        if (prev) return prev; // keep user's explicit choice
        const lang = LANGUAGE_CONFIG[language].ttsLang.split('-')[0];
        const google = voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith(lang));
        return google ? google.name : prev;
      });
    };
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, [language]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInputFocused = useRef(false);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Don't auto-focus the input — Space is reserved for push-to-talk
      // User can click the input to type manually
    }
  }, [messages, open]);

  // ── TTS ──────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(stripMarkdown(text));
    utt.lang = LANGUAGE_CONFIG[language].ttsLang;
    utt.rate = 1.1;
    utt.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const lang = LANGUAGE_CONFIG[language].ttsLang;
    const picked = selectedVoiceName
      ? voices.find(v => v.name === selectedVoiceName)
      : voices.find(v => v.name.toLowerCase().includes('google') && v.lang.startsWith(lang.split('-')[0]))
        ?? voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (picked) utt.voice = picked;

    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled, language, selectedVoiceName]);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  // ── STT ──────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognitionCtor: (new () => ISpeechRecognition) | undefined =
      (window as { SpeechRecognition?: new () => ISpeechRecognition }).SpeechRecognition ||
      (typeof webkitSpeechRecognition !== 'undefined' ? webkitSpeechRecognition : undefined);

    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = LANGUAGE_CONFIG[language].sttLang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); setInput(''); };
    recognition.onerror = () => { setListening(false); setInput(''); };

    recognition.onresult = (e: ISpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      // Show live transcript in the input field
      if (interim) setInput(correctF1Terms(interim, language));
      // Final result → correct, clear input and send
      if (final) {
        setInput('');
        setPendingTranscript(correctF1Terms(final, language));
      }
    };

    recognition.start();
  }, [language]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // Push-to-talk: hold Space to speak, release to auto-send
  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  const listeningRef = useRef(listening);
  const loadingRef = useRef(loading);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Escape: blur the input to return to voice mode
      if (e.code === 'Escape' && isInputFocused.current) {
        inputRef.current?.blur();
        isInputFocused.current = false;
        return;
      }
      // Space: PTT only when the text input is NOT focused
      if (e.code !== 'Space' || e.repeat || isInputFocused.current || listeningRef.current || loadingRef.current) return;
      e.preventDefault();
      startListeningRef.current();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isInputFocused.current) return;
      if (listeningRef.current) stopListeningRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [open]);

  // ── SEND ─────────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    setMessages(m => [...m, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${SOCKET_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, telemetryContext, provider, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errText = `⚠️ Error: ${data.error || 'Unknown error from server.'}`;
        setMessages(m => [...m, { role: 'ai', text: errText }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: data.reply }]);
        speak(data.reply);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Could not reach the server. Make sure the backend is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (text?: string) => sendMessage(text || input);

  // Fire pending voice transcript once sendMessage is in scope
  useEffect(() => {
    if (!pendingTranscript) return;
    const t = setTimeout(() => {
      setPendingTranscript(null);
      sendMessage(pendingTranscript);
    }, 0);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTranscript]);

  return (
    <div className="fixed bottom-4 right-4 z-[3000]">
      {open ? (
        <div className="w-[500px] max-h-[700px] flex flex-col bg-[#0d0d14] border border-white/10 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Header */}
          <div className="flex flex-col bg-[linear-gradient(90deg,#15151e,#1a1a24)] border-b border-white/10 flex-shrink-0">
            <div className="flex justify-between items-center px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-f1-red shadow-[0_0_8px_#e10600] animate-pulse"></div>
                <span className="text-white font-black text-base uppercase tracking-wider">Race Engineer AI</span>
              </div>
              <div className="flex items-center gap-2">
                {/* TTS toggle */}
                <button
                  onClick={() => { setTtsEnabled(v => !v); stopSpeaking(); }}
                  title={ttsEnabled ? 'Disable voice readout' : 'Enable voice readout'}
                  className={`text-sm px-1.5 py-0.5 rounded transition-all ${ttsEnabled ? 'text-white' : 'text-gray-600'}`}
                >
                  {speaking ? '🔊' : ttsEnabled ? '🔈' : '🔇'}
                </button>

                {/* Language toggle */}
                <div className="flex bg-black/50 rounded-full p-0.5 border border-white/10">
                  {(Object.keys(LANGUAGE_CONFIG) as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wider transition-all ${
                        language === l ? 'bg-white/20 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {LANGUAGE_CONFIG[l].label}
                    </button>
                  ))}
                </div>

                {/* Provider toggle */}
                <div className="flex bg-black/50 rounded-full p-0.5 border border-white/10">
                  {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p)}
                      className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                        provider === p ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={provider === p ? { backgroundColor: PROVIDER_CONFIG[p].color } : {}}
                    >
                      {PROVIDER_CONFIG[p].badge}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setOpen(false); stopSpeaking(); }}
                  className="text-gray-500 hover:text-white transition-colors text-lg leading-none ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Voice selector — only shown when TTS is enabled and voices are available */}
            {ttsEnabled && availableVoices.length > 0 && (
              <div className="px-4 pb-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest flex-shrink-0">Voice:</span>
                <select
                  value={selectedVoiceName}
                  onChange={e => setSelectedVoiceName(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 text-white text-[10px] font-black px-2 py-1 rounded outline-none focus:border-f1-red transition-all cursor-pointer truncate"
                >
                  <option value="">— Auto ({LANGUAGE_CONFIG[language].ttsLang})</option>
                  {availableVoices
                    .filter(v => v.lang.startsWith(LANGUAGE_CONFIG[language].ttsLang.split('-')[0]))
                    .map(v => (
                      <option key={v.name} value={v.name}>{v.name}</option>
                    ))
                  }
                </select>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[380px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div className="w-5 h-5 rounded-full bg-f1-red flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center text-xs font-black text-white">RE</div>
                )}
                <div
                  className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-lg ${
                    m.role === 'user'
                      ? 'bg-f1-red/20 text-white border border-f1-red/30 rounded-br-none whitespace-pre-wrap'
                      : 'bg-white/5 text-gray-200 border border-white/5 rounded-bl-none'
                  }`}
                >
                  {m.role === 'user' ? m.text : (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="text-white font-black">{children}</strong>,
                        em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="text-gray-200">{children}</li>,
                        code: ({ children }) => <code className="bg-black/40 text-f1-red px-1 rounded text-xs font-mono">{children}</code>,
                        h1: ({ children }) => <h1 className="text-white font-black text-base mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-white font-black text-sm mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-gray-300 font-black text-xs uppercase tracking-wider mb-1">{children}</h3>,
                        hr: () => <hr className="border-white/10 my-2" />,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                  {/* Re-read button on AI messages */}
                  {m.role === 'ai' && (
                    <button
                      onClick={() => speak(m.text)}
                      className="ml-2 text-gray-600 hover:text-gray-300 transition-colors text-xs align-middle"
                      title="Read aloud"
                    >
                      🔈
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-5 h-5 rounded-full bg-f1-red flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center text-xs font-black text-white">RE</div>
                <div className="bg-white/5 border border-white/5 rounded-lg rounded-bl-none px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-f1-red animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-f1-red animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-f1-red animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {SUGGESTED_QUESTIONS[language].map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-xs font-black text-f1-gray border border-white/10 rounded-full px-2.5 py-1 hover:border-f1-red/50 hover:text-white transition-all uppercase tracking-wide disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex flex-col border-t border-white/10 bg-black/30 flex-shrink-0">
            <div className="flex items-center">
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 px-3 py-3 outline-none font-black"
                placeholder={language === 'es' ? 'Pregunta a tu ingeniero...' : 'Ask your race engineer...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                onFocus={() => { isInputFocused.current = true; }}
                onBlur={() => { isInputFocused.current = false; }}
                disabled={loading}
              />
              {/* Mic button */}
              <button
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                title={listening ? 'Release Space or click to stop' : 'Click or hold Space to speak'}
                className={`px-3 py-3 text-sm transition-colors disabled:opacity-30 ${
                  listening ? 'text-f1-red animate-pulse' : 'text-gray-500 hover:text-white'
                }`}
              >
                🎤
              </button>
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="px-4 py-3 text-f1-red hover:text-white font-black text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ▶
              </button>
            </div>
            {/* Push-to-talk hint */}
            <div className="px-3 pb-1.5 text-[10px] text-gray-700 font-black uppercase tracking-widest select-none">
              {listening
                ? (language === 'es' ? '🔴 Escuchando… suelta Espacio o pulsa 🎤 para enviar' : '🔴 Listening… release Space or click 🎤 to send')
                : isInputFocused.current
                  ? (language === 'es' ? 'Escribe · Enter para enviar · Esc para volver a voz' : 'Type · Enter to send · Esc to return to voice')
                  : (language === 'es' ? 'Mantén Espacio para hablar · Clic para escribir' : 'Hold Space to talk · Click to type')}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group bg-[#15151e] border border-f1-red/40 text-white font-black px-4 py-2.5 rounded-full shadow-[0_0_20px_rgba(225,6,0,0.3)] hover:shadow-[0_0_30px_rgba(225,6,0,0.5)] hover:border-f1-red transition-all text-sm flex items-center gap-2 uppercase tracking-wider"
        >
          <div className="w-2 h-2 rounded-full bg-f1-red shadow-[0_0_6px_#e10600] animate-pulse"></div>
          Race Engineer
        </button>
      )}
    </div>
  );
}

