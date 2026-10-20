import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Check } from 'lucide-react';

interface KempoAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertReply?: (text: string) => void;
}

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const KempoAiModal: React.FC<KempoAiModalProps> = ({
  isOpen,
  onClose,
  onInsertReply,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'ai-init',
      sender: 'ai',
      text: 'Hello! I am your Kempo Pro AI Assistant. How can I help you manage your chats, draft replies, or look up information today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt) return;

    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    setTimeout(() => {
      let reply = "Here's what I can do: Let me draft a clean, professional response for your chat.";
      const lower = prompt.toLowerCase();

      if (lower.includes('caption') || lower.includes('status')) {
        reply = "Red Edition Status: 'Building moves in silence. Red heat all week long 🏎️🔥 #KempoPro'";
      } else if (lower.includes('draft') || lower.includes('reply') || lower.includes('greeting')) {
        reply = "Here's a message draft: 'Hey there! Hope everything is going great with you. Let me know when you are free to chat!'";
      } else if (lower.includes('unread')) {
        reply = "All caught up! You have 0 unread chats. Tap the red '+' button to start a new chat.";
      } else {
        reply = `Understood: "${prompt}". I've formatted this for your KEMPO PRo chat thread. Ready to send anytime!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
        },
      ]);
      setIsGenerating(false);
    }, 700);
  };

  const quickPrompts = [
    "Draft a greeting message",
    "Status caption idea",
    "Translate a message",
    "Write quick reply",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-md h-[80vh] sm:h-[650px] bg-[#161619] sm:rounded-3xl rounded-t-3xl border border-neutral-700/80 flex flex-col shadow-2xl overflow-hidden select-none">
        {/* Header with Iridescent Glow */}
        <div className="px-4 py-3 bg-[#1e1e24] border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 via-purple-600 to-blue-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#161619] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-red-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Kempo AI Assistant
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 border border-red-500/40">
                  PRO
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">Meta AI style assistant</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white bg-neutral-800/80"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick prompt tags */}
        <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#121215] border-b border-neutral-850 shrink-0">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="px-2.5 py-1 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 text-[11.5px] font-medium whitespace-nowrap transition"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-red-600 text-white rounded-br-xs'
                    : 'bg-[#222228] text-neutral-200 border border-neutral-750 rounded-bl-xs'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2.5 items-center text-neutral-400 text-xs">
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-red-400 animate-spin" />
              </div>
              <span>Kempo AI is drafting...</span>
            </div>
          )}
        </div>

        {/* Input prompt bar */}
        <div className="p-3 bg-[#18181c] border-t border-neutral-800 flex items-center gap-2 shrink-0 pb-[max(env(safe-area-inset-bottom),12px)]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Kempo AI or type instructions..."
            className="flex-1 h-10 px-3.5 rounded-full bg-[#202026] text-white text-[13.5px] placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white flex items-center justify-center transition active:scale-95 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
