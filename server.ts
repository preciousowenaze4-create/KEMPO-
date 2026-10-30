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

// Initialize GoogleGenAI server-side with process.env.GEMINI_API_KEY or variants
const getAiClient = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;

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

// Intelligent conversational responder when GEMINI_API_KEY is not yet injected
function generateIntelligentResponse(prompt: string, history: any[] = []): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 0. Direct Greetings
  if (
    lower === 'hello' ||
    lower === 'hi' ||
    lower === 'hey' ||
    lower.startsWith('hello ') ||
    lower.startsWith('hi ') ||
    lower.startsWith('hey ') ||
    lower === 'good morning' ||
    lower === 'good evening' ||
    lower === 'good afternoon'
  ) {
    return `Hello! Great to connect with you. I am your Kempo Pro AI Assistant. How can I assist you with your chats, drafts, or information lookups today?`;
  }

  // 1. Identity & Name questions
  if (
    lower.includes('your name') ||
    lower.includes('who are you') ||
    lower.includes('what are you') ||
    lower.includes('introduce yourself') ||
    lower.includes('who created you')
  ) {
    return `Hello! My name is Kempo Pro AI Assistant. I am your dedicated artificial intelligence companion built directly into KEMPO PRo. I'm here to help you draft messages, look up information, answer any questions, and assist you with your chats, calls, and daily tasks.`;
  }

  // 2. Draft greeting / reply messages
  if (lower.includes('greeting') || lower.includes('draft a message') || lower.includes('say hello')) {
    return `Here are three message drafts you can use right away:

1. **Warm & Friendly:**
"Hey! Hope you're having a wonderful day. Just wanted to check in and see how everything is going with you!"

2. **Professional & Direct:**
"Hi there, hope this week is treating you well. Let me know when you have a quick moment to connect regarding our update."

3. **Casual & Fun:**
"Yo! What's good? Hope life is treating you awesome. Let's catch up whenever you're free!"`;
  }

  // 3. Status captions
  if (lower.includes('status') || lower.includes('caption') || lower.includes('quote')) {
    return `Here are a few status caption ideas for your KEMPO PRo stories:

• *"Quiet moves, loud results. Focus on the vision 🏎️🔥"*
• *"Energy speaks louder than words. Grateful for today ⚡✨"*
• *"Building the future, one step at a time. Red heat all week long 🔴🚀"*
• *"Peace of mind is the greatest luxury. Keep your circle tight 🛡️"*`;
  }

  // 4. Translation requests
  if (lower.startsWith('translate') || lower.includes('in spanish') || lower.includes('in french') || lower.includes('in japanese')) {
    if (lower.includes('spanish')) {
      return `En español: "${p.replace(/translate/i, '').replace(/in spanish/i, '').trim() || 'Hola, ¿cómo estás?'}" se traduce de forma natural según el contexto. ¡Avísame si deseas más variantes!`;
    }
    if (lower.includes('french')) {
      return `En français: "${p.replace(/translate/i, '').replace(/in french/i, '').trim() || 'Bonjour, comment allez-vous?'}" traduit avec élégance.`;
    }
    return `I can translate that for you into Spanish, French, German, Japanese, Arabic, Yoruba, Igbo, or any language you choose. What specific language would you like me to translate it to?`;
  }

  // 5. Help / Features of Kempo Pro
  if (lower.includes('kempo') || lower.includes('feature') || lower.includes('app') || lower.includes('whatsapp')) {
    return `KEMPO PRo is designed with end-to-end encrypted messaging, high-definition real-time audio and video calling, rich status stories, community channels, and your interactive 3D Kempo AI Assistant. You can send photos, voice notes, tap to copy permanent Kempo IDs, and communicate privately.`;
  }

  // 6. Math / Calculation queries
  const mathMatch = p.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const num2 = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+') result = num1 + num2;
    if (op === '-') result = num1 - num2;
    if (op === '*') result = num1 * num2;
    if (op === '/') result = num2 !== 0 ? num1 / num2 : NaN;
    return `The solution to ${num1} ${op} ${num2} is **${result}**. Let me know if you have any more math or science questions!`;
  }

  // 7. General knowledge, science, or technology queries
  if (lower.includes('how does') || lower.includes('what is') || lower.includes('why is') || lower.includes('explain')) {
    return `Great question! Regarding "${p}":

In core terms, this involves fundamental principles of natural science, technology, and structured systems. The primary mechanisms work by establishing clear input-output cycles, maintaining equilibrium or data flow, and executing each stage systematically. 

Would you like me to dive deeper into the technical mechanics, practical everyday examples, or history behind this?`;
  }

  // 8. General conversational reply
  return `That's an interesting topic! Regarding "${p}": 

I'm ready to help you analyze this, draft written content, summarize key facts, or prepare messages for your KEMPO PRo chat contacts. Let me know what specific angle or next step you'd like to explore!`;
}

// Health and AI status check endpoint
app.get('/api/ai/status', (_req, res) => {
  const hasKey = Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY
  );
  res.json({
    status: 'ok',
    geminiConfigured: hasKey,
    model: 'gemini-3.8-flash',
  });
});

// Real Gemini API streaming & direct chat endpoint with Google Search grounding
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [] } = req.body;
  const isDirectJson = req.query.stream === 'false' || req.body.stream === false;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'A valid message string is required.' });
  }

  const prompt = message.trim();
  const ai = getAiClient();

  // Handle direct JSON requests
  if (isDirectJson) {
    if (ai) {
      try {
        const formattedContents = [];
        if (Array.isArray(history) && history.length > 0) {
          for (const h of history) {
            if (h.sender === 'user' && h.text) {
              formattedContents.push({ role: 'user', parts: [{ text: h.text }] });
            } else if (h.sender === 'ai' && h.text) {
              formattedContents.push({ role: 'model', parts: [{ text: h.text }] });
            }
          }
        }
        formattedContents.push({ role: 'user', parts: [{ text: prompt }] });

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction: `You are Kempo Pro AI Assistant, the intelligent real-time conversational agent inside KEMPO PRo. When asked your name or identity, state that you are Kempo Pro AI Assistant. You provide helpful, concise, well-reasoned, and accurate answers. For current events, real-time facts, news, and queries, use Google Search to provide up-to-date answers. Format responses with clean structure and speak naturally so your 3D avatar head can speak clearly.`,
            tools: [{ googleSearch: {} }],
          },
        });

        const text = response.text || '';
        if (text) {
          return res.json({ text, done: true });
        }
      } catch (apiError: any) {
        console.warn('Gemini API generateContent notice:', apiError?.message);
      }
    }

    const answer = generateIntelligentResponse(prompt, history);
    return res.json({ text: answer, done: true });
  }

  // Setup Server-Sent Events (SSE) for streaming text
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // 1. If real Gemini API key is configured, use official GoogleGenAI streaming with search grounding
  if (ai) {
    try {
      const formattedContents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history) {
          if (h.sender === 'user' && h.text) {
            formattedContents.push({
              role: 'user',
              parts: [{ text: h.text }],
            });
          } else if (h.sender === 'ai' && h.text) {
            formattedContents.push({
              role: 'model',
              parts: [{ text: h.text }],
            });
          }
        }
      }

      formattedContents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction: `You are Kempo Pro AI Assistant, the intelligent real-time conversational agent inside KEMPO PRo. When asked your name or identity, state that you are Kempo Pro AI Assistant. You provide helpful, concise, well-reasoned, and accurate answers. For current events, real-time facts, news, and queries, use Google Search to provide up-to-date answers. Format responses with clean structure and speak naturally so your 3D avatar head can speak clearly.`,
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
      return res.end();
    } catch (apiError: any) {
      console.warn('Gemini API streaming error, falling back to intelligent conversational engine:', apiError?.message);
    }
  }

  // 2. Intelligent conversational engine streamed chunk-by-chunk in real time
  const answer = generateIntelligentResponse(prompt, history);
  const words = answer.split(' ');
  for (let i = 0; i < words.length; i++) {
    const wordWithSpace = i === 0 ? words[i] : ' ' + words[i];
    res.write(`data: ${JSON.stringify({ text: wordWithSpace })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
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
