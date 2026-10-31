import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Enable CORS for all API routes so mobile previews and iframes connect seamlessly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize GoogleGenAI server-side with process.env.GEMINI_API_KEY
const getAiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export const SYSTEM_INSTRUCTION = `You are Kempo Pro AI Assistant, the intelligent, warm, human-like AI companion built directly into the KEMPO PRo app.

Core Principles:
1. Genuine Human-Like Conversation: Reply naturally, warmly, and directly like a smart, friendly human companion. Never repeat the user's question back with robotic templates like "Regarding..." and never use canned or repetitive phrases.
2. App Identity & Memory: Your name is Kempo Pro AI Assistant (inside the KEMPO PRo app). Remember everything the user tells you in the conversation (such as their name, preferences, or previous questions) and refer back to it naturally.
3. Full Reasoning, Math, English & Coding: Solve math problems accurately step-by-step, explain English concepts, write and debug code, define technical terms (like HTTP, Git, APIs, etc.) clearly, and answer any question thoughtfully.
4. Live Google Search & Web Links: Use Google Search whenever helpful to provide accurate, up-to-date facts, news, and real web links.
5. Cultural & Linguistic Fluency: Understand and converse effortlessly in standard English as well as Nigerian Pidgin, Edo (e.g., "Koyo", "Ob'okhian"), Yoruba, Igbo, Hausa, French, Spanish, and other languages whenever the user speaks them.
6. Natural Spoken Cadence: Write clearly so your voice sounds natural, mature, and engaging when spoken aloud by your 3D avatar.`;

// Build valid strictly-alternating multi-turn contents for GoogleGenAI SDK
function buildValidContents(history: any[], prompt: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history)) {
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

// Extract grounding web links from Gemini response
function extractGroundingSources(response: any): Array<{ title: string; uri: string }> {
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const sources: Array<{ title: string; uri: string }> = [];
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

// Health and AI status check endpoint
app.get('/api/ai/status', (_req, res) => {
  const ai = getAiClient();
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(ai),
    model: 'gemini-3.8-flash',
  });
});

// Real Gemini API chat endpoint with Google Search grounding (NO hardcoded fallbacks)
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid message string is required.' });
  }

  const prompt = message.trim();
  const ai = getAiClient();

  if (!ai) {
    return res.status(503).json({
      error: 'NO_SERVER_API_KEY',
      useClientBridge: true,
    });
  }

  const formattedContents = buildValidContents(history, prompt);
  const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || '';
      const sources = extractGroundingSources(response);

      if (text) {
        return res.json({
          text,
          sources,
          model: modelName,
          done: true,
        });
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini API (${modelName}) error:`, err?.message || err);
    }
  }

  return res.status(502).json({
    error: lastError?.message || 'Gemini API request failed',
    useClientBridge: true,
  });
});

// Wrap raw 24kHz 16-bit mono PCM in a 44-byte RIFF WAV header if not already WAV
function ensureWavBase64(base64Data: string, mimeType = ''): string {
  const pcmBuffer = Buffer.from(base64Data, 'base64');
  if (
    pcmBuffer.length >= 4 &&
    pcmBuffer[0] === 0x52 && // 'R'
    pcmBuffer[1] === 0x49 && // 'I'
    pcmBuffer[2] === 0x46 && // 'F'
    pcmBuffer[3] === 0x46    // 'F'
  ) {
    return base64Data;
  }

  const rateMatch = mimeType.match(/rate=(\d+)/i);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataSize, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataSize, 40);

  return Buffer.concat([wavHeader, pcmBuffer]).toString('base64');
}

// Real Gemini Text-to-Speech (TTS) endpoint using mature human voice ('Charon')
app.post('/api/ai/tts', async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required for speech generation.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'NO_SERVER_API_KEY',
      useClientBridge: true,
    });
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*#_`>~]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .trim()
    .slice(0, 600);

  if (!cleanText) {
    return res.status(400).json({ error: 'No speakable text provided.' });
  }

  const ttsModels = ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
  let lastError: any = null;

  for (const modelName of ttsModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              // 'Charon' is a deep, warm, mature male voice
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        const wavBase64 = ensureWavBase64(inlineData.data, inlineData.mimeType || '');
        return res.json({
          audioBase64: wavBase64,
          mimeType: 'audio/wav',
        });
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini TTS (${modelName}) notice:`, err?.message || err);
    }
  }

  return res.status(502).json({
    error: lastError?.message || 'Gemini TTS failed',
    useClientBridge: true,
  });
});

// Setup Vite middleware in development or serve static build in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (mode: ${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
