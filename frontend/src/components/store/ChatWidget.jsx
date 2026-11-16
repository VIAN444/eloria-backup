import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { fmtMXN } from "@/api/client";

const API = process.env.REACT_APP_BACKEND_URL;
const CHIPS = ["Algo fresco", "Algo cálido", "Algo dulce", "Sorpréndeme"];

function getSessionId() {
  let id = localStorage.getItem("eloria_chat_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("eloria_chat_session", id);
  }
  return id;
}

function ProductRec({ rec }) {
  return (
    <Link to={`/producto/${rec.id}`} data-testid={`elori-product-link-${rec.id}`}
          className="mt-2 flex items-center gap-3 border border-stone-200 bg-white p-2.5 hover:border-stone-900 transition-colors">
      {rec.image && <img src={rec.image} alt={rec.name} className="w-11 h-14 object-cover bg-stone-100 shrink-0" />}
      <div className="min-w-0">
        <p className="font-serif text-sm text-stone-900 leading-tight truncate">{rec.name}</p>
        <p className="text-[11px] font-mono uppercase tracking-wider text-stone-500">{rec.category}</p>
        <p className="text-xs font-semibold text-stone-900 mt-0.5">{fmtMXN(rec.price)}</p>
      </div>
      <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-amber-800 shrink-0">Ver →</span>
    </Link>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const sessionId = useRef(getSessionId());
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const appendToken = (token) => {
    setMessages((m) => {
      const c = [...m];
      const last = c[c.length - 1];
      c[c.length - 1] = { ...last, content: last.content + token };
      return c;
    });
  };

  const send = async (text) => {
    if (loading || !text.trim()) return;
    const isGreeting = text === "__start__";
    if (!isGreeting) {
      setMessages((m) => [...m, { role: "user", content: text }]);
      setInput("");
    }
    setMessages((m) => [...m, { role: "assistant", content: "", recommendations: [] }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId.current, message: text }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const ev = JSON.parse(line.slice(5));
          if (ev.type === "token") appendToken(ev.content);
          else if (ev.type === "done") {
            setMessages((m) => {
              const c = [...m];
              c[c.length - 1] = { role: "assistant", content: ev.clean, recommendations: ev.recommendations || [] };
              return c;
            });
          } else if (ev.type === "error") {
            setMessages((m) => {
              const c = [...m];
              c[c.length - 1] = { role: "assistant", content: ev.message, recommendations: [] };
              return c;
            });
          }
        }
      }
    } catch {
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: "Elori no está disponible en este momento. Intenta de nuevo.", recommendations: [] };
        return c;
      });
    }
    setLoading(false);
  };

  const openChat = async () => {
    setOpen(true);
    if (started) return;
    setStarted(true);
    const hist = await fetch(`${API}/api/chat/history/${sessionId.current}`).then((r) => r.json()).catch(() => []);
    if (hist.length > 0) setMessages(hist);
    else send("__start__");
  };

  return (
    <>
      <motion.button
        onClick={() => (open ? setOpen(false) : openChat())}
        data-testid="elori-chat-trigger"
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-full bg-stone-900 text-stone-50 flex items-center justify-center shadow-lg shadow-stone-900/25 hover:bg-amber-900 transition-colors"
        aria-label="Abrir chat con Elori"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 z-[80] w-[calc(100vw-3rem)] max-w-sm h-[520px] max-h-[70vh] bg-white border border-stone-200 shadow-xl shadow-stone-900/10 flex flex-col"
            data-testid="elori-chat-panel"
          >
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-900">
              <p className="font-serif text-xl text-stone-50">Elori</p>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400">Tu guía de aromas · ÉLORIA</p>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" data-testid="elori-message-list">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-stone-900 text-stone-50"
                      : "bg-stone-50 border border-stone-200 text-stone-800"}`}
                      data-testid={`elori-message-${m.role}-${i}`}>
                    {m.content}
                    {m.role === "assistant" && m.content === "" && loading && (
                      <span className="inline-flex gap-1 py-1" data-testid="elori-typing-indicator">
                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </span>
                    )}
                    {(m.recommendations || []).map((rec) => <ProductRec key={rec.id} rec={rec} />)}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-2" data-testid="elori-quick-chips">
              {CHIPS.map((c) => (
                <button key={c} onClick={() => send(c)} disabled={loading}
                        data-testid={`elori-chip-${c.toLowerCase().replace(/\s/g, "-")}`}
                        className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900 transition-colors disabled:opacity-40">
                  {c}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="p-4 border-t border-stone-200 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} data-testid="elori-chat-input"
                     placeholder="Cuéntale a Elori..."
                     className="flex-1 rounded-none bg-stone-50/50 border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900 transition-all" />
              <button type="submit" disabled={loading || !input.trim()} data-testid="elori-send-button"
                      className="w-12 bg-stone-900 text-stone-50 flex items-center justify-center hover:bg-amber-900 transition-colors disabled:opacity-40"
                      aria-label="Enviar mensaje">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
