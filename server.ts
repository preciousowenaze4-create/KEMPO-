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

app.use(express.json());

// Initialize GoogleGenAI server-side with process.env.GEMINI_API_KEY
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

// Health and AI status check endpoint
app.get('/api/ai/status', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    model: 'gemini-3.8-flash',
  });
});

// Real Gemini API streaming chat endpoint with Google Search grounding
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid message string is required.' });
  }

  const ai = getAiClient();
  if (!ai) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.',
    });
  }

  // Format conversation history for Gemini API
  const formattedContents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history) {
      if (h.sender === 'user') {
        formattedContents.push({
          role: 'user',
          parts: [{ text: h.text }],
        });
      } else if (h.sender === 'ai') {
        formattedContents.push({
          role: 'model',
          parts: [{ text: h.text }],
        });
      }
    }
  }

  // Append current user message
  formattedContents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Setup Server-Sent Events (SSE) for real-time text streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: `You are Kempo AI Assistant, the intelligent real-time conversational agent inside KEMPO PRo (the WhatsApp-style crimson messaging platform). You provide direct, helpful, concise, and accurate answers. When asked for real-time information, events, facts, or live news, use Google Search to provide up-to-date information. Format responses clearly with clean formatting. Keep responses lively and spoken naturally so your 3D avatar head can speak them clearly.`,
        tools: [{ googleSearch: {} }],
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error during Gemini API generation:', error);
    const errorMsg = error?.message || 'Failed to generate response from Gemini API';
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.end();
  }
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
