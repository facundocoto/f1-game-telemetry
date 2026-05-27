import { useState, useRef, useEffect } from 'react';

type Provider = 'openai' | 'openrouter';

const PROVIDER_CONFIG: Record<Provider, { badge: string; color: string }> = {
  openrouter: { badge: 'OpenRouter',     color: '#6366f1' },
  openai:     { badge: 'GPT-4o mini',    color: '#10a37f' },
};

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface AIChatWidgetProps {
  telemetryContext: object;
}

const SUGGESTED_QUESTIONS = [
  'Where do I need to improve?',
  'Should I pit now?',
  'Which tyres should I use for the pit?',
  'How is my car handling?',
  'Am I pushing too hard on the brakes?',
];

const SOCKET_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : `http://${window.location.hostname}:3000`;

export default function AIChatWidget({ telemetryContext }: AIChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('openai');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Race engineer online. Ask me anything about your session — strategy, tyres, performance, anything." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages(m => [...m, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${SOCKET_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, telemetryContext, provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(m => [...m, { role: 'ai', text: `⚠️ Error: ${data.error || 'Unknown error from server.'}` }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: data.reply }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠️ Could not reach the server. Make sure the backend is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[3000]">
      {open ? (
        <div className="w-[360px] max-h-[600px] flex flex-col bg-[#0d0d14] border border-white/10 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-[linear-gradient(90deg,#15151e,#1a1a24)] border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-f1-red shadow-[0_0_8px_#e10600] animate-pulse"></div>
              <span className="text-white font-black text-base uppercase tracking-wider">Race Engineer AI</span>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors text-lg leading-none ml-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 max-h-[380px]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'ai' && (
                  <div className="w-5 h-5 rounded-full bg-f1-red flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center text-xs font-black text-white">RE</div>
                )}
                <div
                  className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-lg whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-f1-red/20 text-white border border-f1-red/30 rounded-br-none'
                      : 'bg-white/5 text-gray-200 border border-white/5 rounded-bl-none'
                  }`}
                >
                  {m.text}
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
              {SUGGESTED_QUESTIONS.map((q, i) => (
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
          <div className="flex items-center border-t border-white/10 bg-black/30 flex-shrink-0">
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 px-3 py-3 outline-none font-black"
              placeholder="Ask your race engineer..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="px-4 py-3 text-f1-red hover:text-white font-black text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▶
            </button>
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

