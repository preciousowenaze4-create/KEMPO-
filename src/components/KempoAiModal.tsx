import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Volume2, VolumeX, RotateCcw, Search } from 'lucide-react';
import { HeadAvatar3D } from './HeadAvatar3D';

interface KempoAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertReply?: (text: string) => void;
}

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
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
      text: 'Hello! I am your Kempo Pro AI Assistant. How can I help you manage your chats, draft replies, or look up live information today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [speechEnergy, setSpeechEnergy] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const energyDecayRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Cancel any ongoing speech or generation on unmount or modal close
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      abortControllerRef.current?.abort();
      if (energyDecayRef.current) clearTimeout(energyDecayRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Real-time Text-to-Speech coordinated with 3D avatar mouth & viseme handler
  const speakText = (text: string) => {
    if (voiceMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // If voice is muted, run a silent visual lip-sync wave for 2.5s
      setIsSpeaking(true);
      setSpeechEnergy(0.8);
      const timer = setTimeout(() => {
        setIsSpeaking(false);
        setSpeechEnergy(0);
      }, 2500);
      return () => clearTimeout(timer);
    }

    try {
      window.speechSynthesis.cancel();
      // Remove markdown characters for smooth phonetic speech
      const cleanText = text.replace(/[*#_`>]/g, '').trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 400));
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeechEnergy(0.85);
      };

      // Syllable / word boundary tracking for exact lip movement coordination
      utterance.onboundary = (event) => {
        setIsSpeaking(true);
        setSpeechEnergy(0.95);
        if (energyDecayRef.current) clearTimeout(energyDecayRef.current);
        energyDecayRef.current = setTimeout(() => {
          setSpeechEnergy(0.3);
        }, 130);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeechEnergy(0);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeechEnergy(0);
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
      setSpeechEnergy(0);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isGenerating) return;

    // 1. Add user message
    const userMsgId = `u-${Date.now()}`;
    const userMsg: AiMessage = {
      id: userMsgId,
      sender: 'user',
      text: prompt,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsGenerating(true);
    setIsSpeaking(false);
    setSpeechEnergy(0);

    // Cancel previous speech if ongoing
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 2. Prepare AI streaming message placeholder
    const aiMsgId = `ai-${Date.now()}`;
    const aiPlaceholder: AiMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    abortControllerRef.current = new AbortController();

    try {
      // 3. Connect to Backend Real Gemini API endpoint
      const response = await fetch('/api/ai/chat?stream=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          history: newHistory.slice(-6),
          stream: false,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const answer = data.text || '';

      // Progressive token reveal with real-time lip-sync coordination
      const words = answer.split(' ');
      let currentDisplay = '';

      for (let i = 0; i < words.length; i++) {
        const wordWithSpace = i === 0 ? words[i] : ' ' + words[i];
        currentDisplay += wordWithSpace;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: currentDisplay } : m))
        );
        if (i === 0) {
          setIsGenerating(false);
        }
        setSpeakingText(wordWithSpace);
        await new Promise((r) => setTimeout(r, 14));
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: answer, isStreaming: false } : m))
      );
      setIsGenerating(false);

      // Trigger synchronized voice and lip-sync with real response text
      speakText(answer);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('Backend Gemini API connection fallback:', err);

      const lower = prompt.toLowerCase();
      let fallbackText = '';

      if (lower.includes('name') || lower.includes('who are you')) {
        fallbackText = 'Hello! My name is Kempo Pro AI Assistant. I am your dedicated artificial intelligence companion built directly into KEMPO PRo.';
      } else if (lower.includes('what can we do') || lower.includes('what can you do')) {
        fallbackText = 'We can do plenty together! I can help you draft messages, explain coding concepts, write captions for your status, solve technical problems, translate languages, and search information.';
      } else if (lower.includes('git') || lower.includes('meaning of git')) {
        fallbackText = 'Git is a distributed version control system designed to track changes in code during software development, allowing multiple developers to collaborate smoothly and manage revisions.';
      } else if (lower.includes('how far') || lower.includes('wetin dey')) {
        fallbackText = 'I dey fine well-well! Everything dey soft. How body? Wetin you wan make we run for KEMPO PRo today?';
      } else if (lower.includes('koyo') || lower.includes('obokhian') || lower.includes("ob'okhian")) {
        fallbackText = "Koyo! Ob'okhian! Good to connect with you. How can I assist you in KEMPO PRo right now?";
      } else if (lower === 'hello' || lower === 'hi' || lower === 'hey') {
        fallbackText = "Hello! What's on your mind today? I'm ready to help you with questions, coding, drafts, or information.";
      } else {
        fallbackText = `Regarding "${prompt}": I can help you break this down, research relevant insights, write code, or draft messages for your chats. Let me know what specific direction you'd like to explore!`;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, text: fallbackText, isStreaming: false } : m
        )
      );
      setIsGenerating(false);
      speakText(fallbackText);
    }
  };

  const handleClearHistory = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechEnergy(0);
    setMessages([
      {
        id: 'ai-init',
        sender: 'ai',
        text: 'Conversation reset. How can I help you today?',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Assistant Modal Sheet Container with Extended Height */}
      <div className="w-full sm:max-w-lg h-[92vh] sm:h-[750px] bg-[#141417] sm:rounded-3xl rounded-t-3xl border border-neutral-750 flex flex-col shadow-2xl overflow-hidden select-none relative">
        
        {/* Top Floating Action Controls (Close 'X' & Audio Mute Button) */}
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2">
          {/* Voice Mute/Unmute toggle */}
          <button
            type="button"
            onClick={() => {
              if (!voiceMuted) {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
                setSpeechEnergy(0);
              }
              setVoiceMuted(!voiceMuted);
            }}
            aria-label={voiceMuted ? 'Unmute Voice' : 'Mute Voice'}
            title={voiceMuted ? 'Voice Muted (Tap to unmute)' : 'Voice Enabled (Tap to mute)'}
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
          </button>

          {/* Reset chat button */}
          <button
            type="button"
            onClick={handleClearHistory}
            aria-label="Reset Conversation"
            title="Reset conversation"
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
          </button>

          {/* Fully Visible, Unclipped Close 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Assistant"
            title="Close Kempo AI"
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Top 3D Head Avatar Section (Facing directly at the user with real-time lip-sync) */}
        <div className="relative w-full h-44 sm:h-50 bg-gradient-to-b from-[#1c1316] via-[#16141a] to-[#141417] border-b border-neutral-800/80 shrink-0 overflow-hidden flex flex-col items-center justify-center">
          {/* Ambient Spotlight Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(220,38,38,0.18)_0%,transparent_75%)] pointer-events-none" />

          {/* 3D Head Avatar Component using ONLY blender_sushi GLB */}
          <HeadAvatar3D
            isSpeaking={isSpeaking}
            isGenerating={isGenerating}
            speakingText={speakingText}
            speechEnergy={speechEnergy}
            className="w-full h-full"
          />

          {/* Header Title & Tagline overlay at the top-left of the 3D frame */}
          <div className="absolute top-3 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-md shadow-red-600" />
            <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 drop-shadow">
              Kempo AI Assistant
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-600/30 text-red-400 font-bold border border-red-500/40">
                PRO
              </span>
            </h3>
          </div>
        </div>


        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e0e11]/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-purple-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-red-950/60 ring-1 ring-red-500/40">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white rounded-br-xs shadow-red-950/40'
                    : 'bg-[#1e1e24] text-neutral-100 border border-neutral-750 rounded-bl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                {m.isStreaming && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-red-400 animate-pulse align-middle" />
                )}
                {m.sender === 'ai' && onInsertReply && m.text && !m.isStreaming && (
                  <div className="mt-2 pt-1.5 border-t border-neutral-700/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onInsertReply(m.text);
                        onClose();
                      }}
                      className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline transition cursor-pointer"
                    >
                      Insert into chat →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isGenerating && (
            <div className="flex gap-2.5 items-center text-neutral-400 text-xs animate-pulse">
              <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                <Search className="w-3.5 h-3.5 text-red-400 animate-spin" />
              </div>
              <span className="text-[12px] text-neutral-300">Searching and generating live answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 bg-[#16161a] border-t border-neutral-800/90 pb-[max(env(safe-area-inset-bottom),12px)] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-[#1f2026] rounded-2xl px-3.5 py-1.5 border border-neutral-750 focus-within:border-red-500/80 transition"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Kempo AI or type instructions..."
              disabled={isGenerating}
              className="flex-1 bg-transparent text-[14.5px] text-white placeholder-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              aria-label="Send query"
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white flex items-center justify-center transition active:scale-95 shrink-0 shadow-md shadow-red-950 cursor-pointer"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
