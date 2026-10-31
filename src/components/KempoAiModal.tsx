import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Volume2, VolumeX, RotateCcw, Search, Mic, MicOff, ExternalLink } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { HeadAvatar3D } from './HeadAvatar3D';

interface KempoAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertReply?: (text: string) => void;
}

interface WebSource {
  title: string;
  uri: string;
}

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: WebSource[];
  isStreaming?: boolean;
}

const SYSTEM_INSTRUCTION = `You are Kempo Pro AI Assistant, the intelligent, warm, human-like AI companion built directly into the KEMPO PRo app.

Core Principles:
1. Genuine Human-Like Conversation: Reply naturally, warmly, and directly like a smart, friendly human companion. Never repeat the user's question back with robotic templates like "Regarding..." and never use canned or repetitive phrases.
2. App Identity & Memory: Your name is Kempo Pro AI Assistant (inside the KEMPO PRo app). Remember everything the user tells you in the conversation (such as their name, preferences, or previous questions) and refer back to it naturally.
3. Full Reasoning, Math, English & Coding: Solve math problems accurately step-by-step, explain English concepts, write and debug code, define technical terms (like HTTP, Git, APIs, etc.) clearly, and answer any question thoughtfully.
4. Live Google Search & Web Links: Use Google Search whenever helpful to provide accurate, up-to-date facts, news, and real web links.
5. Cultural & Linguistic Fluency: Understand and converse effortlessly in standard English as well as Nigerian Pidgin, Edo (e.g., "Koyo", "Ob'okhian"), Yoruba, Igbo, Hausa, French, Spanish, and other languages whenever the user speaks them.
6. Natural Spoken Cadence: Write clearly so your voice sounds natural, mature, and engaging when spoken aloud by your 3D avatar.`;

function buildValidContents(history: AiMessage[], prompt: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const h of history) {
    if (!h || !h.text || h.id === 'ai-init') continue;
    const role: 'user' | 'model' = h.sender === 'user' ? 'user' : 'model';

    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text: String(h.text) }] });
      }
    } else {
      const lastRole = contents[contents.length - 1].role;
      if (lastRole === role) {
        contents[contents.length - 1].parts[0].text += `\n${h.text}`;
      } else {
        contents.push({ role, parts: [{ text: String(h.text) }] });
      }
    }
  }

  if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  } else {
    const lastText = contents[contents.length - 1].parts[0].text;
    if (lastText !== prompt) {
      contents[contents.length - 1].parts[0].text += `\n${prompt}`;
    }
  }

  return contents;
}

function extractGroundingSources(response: any): WebSource[] {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const sources: WebSource[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      sources.push({ title, uri });
    }
  }
  return sources;
}

function getBridgeAiClient(): GoogleGenAI {
  const apiKey =
    (typeof window !== 'undefined' && (window as any).GEMINI_API_KEY) ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    'GEMINI_API_KEY';

  return new GoogleGenAI({ apiKey });
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
      text: 'Hello! I am your Kempo Pro AI Assistant. Ask me anything—math, English, coding, live web search, or casual conversation—or tap the microphone to talk with me in real time.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [speechEnergy, setSpeechEnergy] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const energyDecayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsRafRef = useRef<number | null>(null);
  const speechSessionIdRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Clear any stale service worker registrations so API calls and fresh bundles are never cached
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  const stopAllAudio = () => {
    speechSessionIdRef.current += 1;
    if (ttsRafRef.current !== null) {
      cancelAnimationFrame(ttsRafRef.current);
      ttsRafRef.current = null;
    }
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.onended = null;
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {
        // Ignore if already stopped
      }
      activeSourceNodeRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (energyDecayRef.current) {
      clearTimeout(energyDecayRef.current);
      energyDecayRef.current = null;
    }
    setIsSpeaking(false);
    setSpeechEnergy(0);
  };

  // Unlock / resume Web Audio API context during user gesture (crucial for iOS Safari)
  const ensureAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
      abortControllerRef.current?.abort();
      recognitionRef.current?.abort();
    };
  }, []);

  // Decode base64 PCM (24kHz 16-bit signed LE mono) or RIFF WAV into Float32 samples and play with 60fps RMS lip-sync
  const playPcmOrWavBase64 = async (
    base64Data: string,
    mimeType: string,
    spokenWords: string[],
    sessionId: number
  ): Promise<boolean> => {
    const audioCtx = ensureAudioContext();
    if (!audioCtx) return false;

    try {
      await audioCtx.resume();
    } catch {
      // Continue
    }

    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Check if the buffer has a 44-byte RIFF WAV header
    const isRiff =
      len > 44 &&
      bytes[0] === 0x52 && // 'R'
      bytes[1] === 0x49 && // 'I'
      bytes[2] === 0x46 && // 'F'
      bytes[3] === 0x46;   // 'F'

    let sampleRate = 24000;
    let pcmOffset = 0;

    if (isRiff) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const headerRate = view.getUint32(24, true);
      if (headerRate >= 8000 && headerRate <= 96000) {
        sampleRate = headerRate;
      }
      pcmOffset = 44;
    } else {
      const rateMatch = mimeType.match(/rate=(\d+)/i);
      if (rateMatch) {
        sampleRate = parseInt(rateMatch[1], 10);
      }
    }

    const pcmByteLength = len - pcmOffset;
    const numSamples = Math.floor(pcmByteLength / 2);
    if (numSamples <= 0) return false;

    const float32Samples = new Float32Array(numSamples);
    const dataView = new DataView(bytes.buffer, bytes.byteOffset + pcmOffset, numSamples * 2);

    for (let i = 0; i < numSamples; i++) {
      const int16 = dataView.getInt16(i * 2, true);
      float32Samples[i] = int16 / 32768.0;
    }

    const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
    audioBuffer.copyToChannel(float32Samples, 0);

    if (speechSessionIdRef.current !== sessionId) return true;

    const sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioCtx.destination);
    activeSourceNodeRef.current = sourceNode;

    const duration = audioBuffer.duration;
    const startTime = audioCtx.currentTime;
    const windowSize = Math.floor(sampleRate * 0.04); // 40ms RMS window

    setIsSpeaking(true);

    const updateLipSync = () => {
      if (speechSessionIdRef.current !== sessionId) return;
      const elapsed = audioCtx.currentTime - startTime;
      if (elapsed >= duration) {
        setIsSpeaking(false);
        setSpeechEnergy(0);
        return;
      }

      const centerSample = Math.floor(elapsed * sampleRate);
      const startSample = Math.max(0, centerSample - Math.floor(windowSize / 2));
      const endSample = Math.min(numSamples, startSample + windowSize);

      let sumSquares = 0;
      const count = endSample - startSample;
      for (let i = startSample; i < endSample; i++) {
        const s = float32Samples[i];
        sumSquares += s * s;
      }

      const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
      // Normalize RMS into [0, 1] mouth energy with silence threshold so pauses close the mouth naturally
      const normalizedEnergy = rms < 0.012 ? 0 : Math.min(1, Math.pow(rms * 5.2, 0.75));
      setSpeechEnergy(normalizedEnergy);

      // Update current word for vowel/consonant viseme shaping (jawOpen, mouthFunnel, mouthPucker)
      if (spokenWords.length > 0) {
        const wordIndex = Math.min(
          spokenWords.length - 1,
          Math.floor((elapsed / Math.max(0.1, duration)) * spokenWords.length)
        );
        setSpeakingText(spokenWords[wordIndex] || '');
      }

      ttsRafRef.current = requestAnimationFrame(updateLipSync);
    };

    sourceNode.onended = () => {
      if (speechSessionIdRef.current === sessionId) {
        if (ttsRafRef.current !== null) {
          cancelAnimationFrame(ttsRafRef.current);
          ttsRafRef.current = null;
        }
        setIsSpeaking(false);
        setSpeechEnergy(0);
      }
    };

    sourceNode.start(0);
    ttsRafRef.current = requestAnimationFrame(updateLipSync);
    return true;
  };

  // Speak response using Real Gemini TTS ('Charon' mature human voice) synchronized with 3D avatar
  const speakText = async (text: string) => {
    stopAllAudio();
    const sessionId = speechSessionIdRef.current;

    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[*#_`>~]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()
      .slice(0, 600);

    if (!cleanText) return;

    const spokenWords = cleanText.split(/\s+/).filter(Boolean);

    if (voiceMuted) {
      // Muted visual lip-sync pulse
      setIsSpeaking(true);
      setSpeechEnergy(0.75);
      energyDecayRef.current = setTimeout(() => {
        if (speechSessionIdRef.current === sessionId) {
          setIsSpeaking(false);
          setSpeechEnergy(0);
        }
      }, 2400);
      return;
    }

    // 1. Try Backend /api/ai/tts first
    try {
      const ttsRes = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText }),
      });

      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        if (ttsData?.audioBase64 && speechSessionIdRef.current === sessionId) {
          const played = await playPcmOrWavBase64(
            ttsData.audioBase64,
            ttsData.mimeType || 'audio/wav',
            spokenWords,
            sessionId
          );
          if (played) return;
        }
      }
    } catch {
      // Proceed to AI Studio Gemini bridge
    }

    // 2. Call Real Gemini TTS via AI Studio Bridge ('Charon' mature voice)
    const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
    const bridgeAi = getBridgeAiClient();

    for (const modelName of ttsModels) {
      if (speechSessionIdRef.current !== sessionId) return;
      try {
        const response = await bridgeAi.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: cleanText }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Charon' },
              },
            },
          },
        });

        const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData?.data && speechSessionIdRef.current === sessionId) {
          const played = await playPcmOrWavBase64(
            inlineData.data,
            inlineData.mimeType || 'audio/L16;rate=24000',
            spokenWords,
            sessionId
          );
          if (played) return;
        }
      } catch (err) {
        console.warn(`Gemini TTS (${modelName}) notice:`, err);
      }
    }

    // 3. Fallback to deep, mature browser SpeechSynthesis if Web Audio TTS is unavailable
    if (speechSessionIdRef.current !== sessionId) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        const matureVoice =
          voices.find(
            (v) =>
              (v.name.includes('Daniel') ||
                v.name.includes('Aaron') ||
                v.name.includes('Oliver') ||
                v.name.includes('Arthur') ||
                v.name.includes('Google UK English Male') ||
                v.name.includes('Male')) &&
              v.lang.startsWith('en')
          ) || voices.find((v) => v.lang.startsWith('en'));

        if (matureVoice) utterance.voice = matureVoice;
        utterance.rate = 0.96;
        utterance.pitch = 0.85;

        utterance.onstart = () => {
          if (speechSessionIdRef.current !== sessionId) return;
          setIsSpeaking(true);
          setSpeechEnergy(0.85);
        };

        utterance.onboundary = (event) => {
          if (speechSessionIdRef.current !== sessionId) return;
          setIsSpeaking(true);
          setSpeechEnergy(0.92);
          const charIdx = event.charIndex || 0;
          const currentSnippet = cleanText.slice(charIdx, charIdx + 16).split(/\s+/)[0] || '';
          if (currentSnippet) setSpeakingText(currentSnippet);

          if (energyDecayRef.current) clearTimeout(energyDecayRef.current);
          energyDecayRef.current = setTimeout(() => {
            if (speechSessionIdRef.current === sessionId) {
              setSpeechEnergy(0.28);
            }
          }, 130);
        };

        utterance.onend = () => {
          if (speechSessionIdRef.current === sessionId) {
            setIsSpeaking(false);
            setSpeechEnergy(0);
          }
        };

        utterance.onerror = () => {
          if (speechSessionIdRef.current === sessionId) {
            setIsSpeaking(false);
            setSpeechEnergy(0);
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
        setSpeechEnergy(0);
      }
    }
  };

  // Query Real Gemini API (Server endpoint first, then AI Studio Gemini API Bridge)
  const requestRealGeminiResponse = async (
    prompt: string,
    history: AiMessage[],
    signal: AbortSignal
  ): Promise<{ text: string; sources: WebSource[] }> => {
    // 1. Try Backend Express Server (/api/ai/chat)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          history: history.slice(-10),
        }),
        signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.text) {
          return {
            text: data.text,
            sources: Array.isArray(data.sources) ? data.sources : [],
          };
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
    }

    // 2. Call Real Gemini API via AI Studio Host Bridge (generativelanguage.googleapis.com)
    const bridgeAi = getBridgeAiClient();
    const formattedContents = buildValidContents(history.slice(-10), prompt);

    const attempts: Array<{ model: string; useSearch: boolean }> = [
      { model: 'gemini-3.8-flash', useSearch: true },
      { model: 'gemini-2.5-flash', useSearch: true },
      { model: 'gemini-3.8-flash', useSearch: false },
      { model: 'gemini-2.5-flash', useSearch: false },
    ];

    let lastError: any = null;

    for (const attempt of attempts) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      try {
        const response = await bridgeAi.models.generateContent({
          model: attempt.model,
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            ...(attempt.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
          },
        });

        const text = response.text || '';
        if (text) {
          return {
            text,
            sources: extractGroundingSources(response),
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini model (${attempt.model}, search=${attempt.useSearch}) notice:`, err);
      }
    }

    throw lastError || new Error('Unable to reach Gemini API.');
  };

  // Real-time voice conversation: listen to user voice and auto-submit
  const toggleListening = () => {
    ensureAudioContext();

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      stopAllAudio();

      const recognition = new SpeechRecognition();
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      let capturedText = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            capturedText += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }
        const text = capturedText || currentInterim;
        if (text) setInput(text);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalPrompt = capturedText.trim();
        if (finalPrompt) {
          handleSend(finalPrompt);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Speech recognition start notice:', err);
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isGenerating) return;

    // Unlock Web Audio API on user interaction so iOS Safari plays Gemini TTS audio cleanly
    ensureAudioContext();
    stopAllAudio();

    const userMsgId = `u-${Date.now()}`;
    const userMsg: AiMessage = {
      id: userMsgId,
      sender: 'user',
      text: prompt,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setIsGenerating(true);

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
      const { text: answer, sources } = await requestRealGeminiResponse(
        prompt,
        updatedHistory,
        abortControllerRef.current.signal
      );

      setIsGenerating(false);

      // Start fetching & playing Real Gemini TTS voice immediately while text streams in
      speakText(answer);

      const words = answer.split(' ');
      let currentDisplay = '';

      for (let i = 0; i < words.length; i++) {
        if (abortControllerRef.current.signal.aborted) break;
        const wordWithSpace = i === 0 ? words[i] : ' ' + words[i];
        currentDisplay += wordWithSpace;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: currentDisplay } : m))
        );
        await new Promise((r) => setTimeout(r, 12));
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: answer, sources, isStreaming: false }
            : m
        )
      );
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Gemini API error:', err);
      const errMessage =
        err?.message || 'Connection to Gemini AI timed out. Please check your connection and try again.';

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: `Unable to complete request: ${errMessage}`, isStreaming: false }
            : m
        )
      );
      setIsGenerating(false);
    }
  };

  const handleClearHistory = () => {
    stopAllAudio();
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setMessages([
      {
        id: 'ai-init',
        sender: 'ai',
        text: 'Conversation reset. Ask me anything or tap the microphone to talk!',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Assistant Modal Sheet Container */}
      <div className="w-full sm:max-w-lg h-[92vh] sm:h-[750px] bg-[#141417] sm:rounded-3xl rounded-t-3xl border border-neutral-750 flex flex-col shadow-2xl overflow-hidden select-none relative">
        
        {/* Top Floating Action Controls */}
        <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!voiceMuted) {
                stopAllAudio();
              }
              setVoiceMuted(!voiceMuted);
            }}
            aria-label={voiceMuted ? 'Unmute Voice' : 'Mute Voice'}
            title={voiceMuted ? 'Voice Muted (Tap to unmute)' : 'Voice Enabled (Tap to mute)'}
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            {voiceMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-red-400" />}
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            aria-label="Reset Conversation"
            title="Reset conversation"
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
          </button>

          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              onClose();
            }}
            aria-label="Close Assistant"
            title="Close Kempo AI"
            className="w-8 h-8 rounded-full bg-neutral-900/90 hover:bg-red-600 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700/80 shadow-lg active:scale-90 transition cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Top 3D Head Avatar Section */}
        <div className="relative w-full h-44 sm:h-50 bg-gradient-to-b from-[#1c1316] via-[#16141a] to-[#141417] border-b border-neutral-800/80 shrink-0 overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(220,38,38,0.18)_0%,transparent_75%)] pointer-events-none" />

          <HeadAvatar3D
            isSpeaking={isSpeaking}
            isGenerating={isGenerating}
            speakingText={speakingText}
            speechEnergy={speechEnergy}
            className="w-full h-full"
          />

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
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#0e0e11]/50 select-text">
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

                {/* Google Search Grounding Web Sources */}
                {m.sender === 'ai' && m.sources && m.sources.length > 0 && !m.isStreaming && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-700/60 space-y-1">
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
                      Web Sources
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {m.sources.slice(0, 4).map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] bg-neutral-800/90 hover:bg-neutral-700 text-red-300 hover:text-red-200 px-2 py-0.5 rounded-md border border-neutral-700 transition max-w-full truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {m.sender === 'ai' && onInsertReply && m.text && !m.isStreaming && (
                  <div className="mt-2 pt-1.5 border-t border-neutral-700/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        stopAllAudio();
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
              <span className="text-[12px] text-neutral-300">Thinking & searching with Gemini...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area with Real-Time Voice Chat & Text Input */}
        <div className="p-3 bg-[#16161a] border-t border-neutral-800/90 pb-[max(env(safe-area-inset-bottom),12px)] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={`flex items-center gap-2 bg-[#1f2026] rounded-2xl px-3 py-1.5 border transition ${
              isListening ? 'border-red-500 ring-2 ring-red-500/30' : 'border-neutral-750 focus-within:border-red-500/80'
            }`}
          >
            <button
              type="button"
              onClick={toggleListening}
              disabled={isGenerating}
              aria-label={isListening ? 'Stop listening' : 'Talk with Kempo AI'}
              title={isListening ? 'Listening to your voice (tap to stop)' : 'Tap to talk with Kempo AI in real-time'}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-600/40 shadow-lg shadow-red-950'
                  : 'bg-neutral-800/90 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700/80'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-red-400" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? 'Listening to your voice... Speak now' : 'Ask Kempo AI or tap mic to talk...'}
              disabled={isGenerating}
              className="flex-1 bg-transparent text-[14.5px] text-white placeholder-neutral-400 focus:outline-none"
            />

            {isListening && (
              <div className="flex items-center gap-0.5 px-1">
                <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-3 bg-red-500 rounded-full animate-bounce" />
              </div>
            )}

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
