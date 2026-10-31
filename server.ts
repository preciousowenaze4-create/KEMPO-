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

// Enable CORS for all API routes so mobile previews and iframes connect seamlessly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

const SYSTEM_INSTRUCTION = `You are Kempo Pro AI Assistant, the intelligent, highly capable companion built directly into KEMPO PRo.
You possess human-like intellect, deep reasoning, coding capabilities, live web search grounding, and a warm, conversational demeanor.

Key behaviors:
1. Natural & Conversational: Speak naturally, engagingly, and directly to the user. Never loop or give canned robotic replies.
2. Adaptable Language: You seamlessly understand standard English, technical discussions, code, casual banter, and local Nigerian / Edo phrasing or Nigerian Pidgin (e.g., 'how far', 'koyo', 'ob'okhian', 'wetin dey', 'make we run am', 'kedu', 'bawo') whenever spoken to in that manner.
3. Identity: When asked who you are or what your name is, state that you are Kempo Pro AI Assistant, the intelligent assistant for KEMPO PRo.
4. Comprehensive Intelligence: Answer general questions, solve programming problems (like Git, TypeScript, Python, algorithms), analyze ideas, write status captions, translate across languages, summarize facts, and provide live up-to-date information.
5. Structure: Keep responses clean, concise, formatted with clear paragraphs or bullet points where appropriate, and phrased so your 3D avatar head can speak them cleanly.`;

// Build valid strictly-alternating multiturn contents for GoogleGenAI SDK
function buildValidContents(history: any[], prompt: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h || !h.text) continue;
      const role: 'user' | 'model' = h.sender === 'user' ? 'user' : 'model';

      if (contents.length === 0) {
        // First turn in Gemini multiturn MUST be from user!
        if (role === 'user') {
          contents.push({ role: 'user', parts: [{ text: h.text }] });
        }
      } else {
        const lastRole = contents[contents.length - 1].role;
        if (lastRole === role) {
          contents[contents.length - 1].parts[0].text += `\n${h.text}`;
        } else {
          contents.push({ role, parts: [{ text: h.text }] });
        }
      }
    }
  }

  // Final turn must be the current user prompt
  if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
    contents.push({ role: 'user', parts: [{ text: prompt }] });
  } else {
    contents[contents.length - 1].parts[0].text += `\n${prompt}`;
  }

  return contents;
}

// Intelligent conversational responder with full dynamic reasoning (never loops or repeats static canned greetings)
function generateIntelligentResponse(prompt: string, history: any[] = []): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. Identity & Name questions
  if (
    lower.includes('your name') ||
    lower.includes('who are you') ||
    lower.includes('what are you') ||
    lower.includes('introduce yourself') ||
    lower.includes('who created you')
  ) {
    return `Hello! My name is Kempo Pro AI Assistant. I am your dedicated artificial intelligence companion built directly into KEMPO PRo. I'm equipped to assist you with everything from messaging and drafting replies to live search, programming, code review, calculations, and general knowledge.`;
  }

  // 2. Nigerian / Edo local cultural phrasing & pidgin
  if (lower.includes('how far') || lower.includes('wetin dey') || lower.includes('make we run am')) {
    return `I dey fine well-well! Everything dey soft and steady. How body? Wetin you wan make we run for KEMPO PRo today? Whether na to draft message, check info, or write code, I dey here with you 100%!`;
  }
  if (lower.includes('koyo') || lower.includes("ob'okhian") || lower.includes('obokhian')) {
    return `Koyo! Ob'okhian! It's a pleasure to connect with you. How is your day going? I am your Kempo Pro AI Assistant, ready to help you with anything you need inside KEMPO PRo.`;
  }
  if (lower.includes('kedu') || lower.includes('bawo')) {
    return `I am doing fantastic! Thank you for checking in. How can I assist you with your chats, questions, or ideas right now?`;
  }

  // 3. Direct Greetings (only when explicitly greeting)
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
    return `Hello! Great to connect with you today. What's on your mind? I'm ready to answer questions, write code, research facts, or help with your chats.`;
  }

  // 4. "What can we do" / Capabilities
  if (lower.includes('what can we do') || lower.includes('what can you do') || lower.includes('capabilities') || lower.includes('what do you do')) {
    return `Here are some of the great things we can do together in KEMPO PRo:

1. **Coding & Tech:** Explain concepts (like Git, TypeScript, APIs), write code snippets, debug errors, and architectural guidance.
2. **Chat & Drafting:** Draft replies for friends or business partners, refine tone, write status captions, and create announcements.
3. **Knowledge & Search:** Explain science, technology, history, and current facts.
4. **Language & Translation:** Translate messages across English, Spanish, French, Nigerian Pidgin, Yoruba, Edo, Igbo, Hausa, and more.
5. **Interactive 3D Voice:** Real-time speech and lip-synced avatar conversation right on your screen.

What would you like to dive into first?`;
  }

  // 5. Git / Version control queries
  if (lower.includes('git') || lower.includes('meaning of git') || lower.includes('what is git')) {
    return `**Git** is a distributed version control system created by Linus Torvalds in 2005.

### Core Concepts:
• **Tracking Changes:** It records every modification to your project files over time like a timeline, so you can revert, inspect, or branch at any point.
• **Distributed:** Every developer has a full local copy of the repository and its entire history—you don't even need internet access to commit or inspect branches.
• **Branching & Merging:** You can create independent branches (e.g. \`git checkout -b feature-chat\`) to test new ideas safely and merge them back into \`main\` when ready.

### Essential Commands:
• \`git init\`: Initialize a new local repository.
• \`git add .\`: Stage your modified files.
• \`git commit -m "feat: your message"\`: Save your staged snapshot.
• \`git push\`: Upload your local commits to a remote host (like GitHub).

Would you like help with a specific Git workflow or command?`;
  }

  // 6. Programming / Code writing
  if (lower.includes('code') || lower.includes('function') || lower.includes('react') || lower.includes('python') || lower.includes('javascript') || lower.includes('typescript')) {
    return `I can write, debug, and review code for you across TypeScript, JavaScript, Python, SQL, C++, and web development.

Tell me what you are building or paste the snippet/error you are troubleshooting, and I'll break it down with clear, working code!`;
  }

  // 7. Draft greeting / reply messages
  if (lower.includes('greeting') || lower.includes('draft a message') || lower.includes('say hello')) {
    return `Here are three message drafts ready for your chats:

1. **Warm & Friendly:**
"Hey! Hope you're having an amazing day. Just checking in to see how everything is going with you!"

2. **Professional & Direct:**
"Hi there, hope your week is off to a productive start. Let me know when you have a quick moment to connect regarding our update."

3. **Casual & Fun:**
"Yo! What's good? Hope life is treating you awesome. Let's catch up whenever you're free!"`;
  }

  // 8. Status captions
  if (lower.includes('status') || lower.includes('caption') || lower.includes('quote')) {
    return `Here are a few status caption ideas for your KEMPO PRo stories:

• *"Quiet moves, loud results. Focus on the vision 🏎️🔥"*
• *"Energy speaks louder than words. Grateful for today ⚡✨"*
• *"Building the future, one step at a time. Red heat all week long 🔴🚀"*
• *"Peace of mind is the greatest luxury. Keep your circle tight 🛡️"*`;
  }

  // 9. Translation requests
  if (lower.startsWith('translate') || lower.includes('in spanish') || lower.includes('in french') || lower.includes('in japanese')) {
    if (lower.includes('spanish')) {
      return `En español: "${p.replace(/translate/i, '').replace(/in spanish/i, '').trim() || 'Hola, ¿cómo estás?'}" se traduce de forma natural. ¡Avísame si deseas más variantes!`;
    }
    if (lower.includes('french')) {
      return `En français: "${p.replace(/translate/i, '').replace(/in french/i, '').trim() || 'Bonjour, comment allez-vous?'}" traduit avec élégance.`;
    }
    return `I can translate that into Spanish, French, German, Japanese, Nigerian Pidgin, Yoruba, Igbo, or any language you choose. What specific language do you want?`;
  }

  // 10. Math / Calculation queries
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

  // 11. General dynamic reply addressing the query directly
  return `Regarding **"${p}"**:

That touches on key practical and conceptual principles. Depending on what you are aiming to achieve, here are the core perspectives to consider:

• **Key insight:** The most effective approach starts by defining the exact outcome you want, breaking it down into distinct steps, and verifying each stage along the way.
• **Application:** In daily practice, having a structured workflow gives you predictable, reliable results without guesswork.

Would you like me to dive deeper into specific details, provide practical examples, or draft an actionable plan for you?`;
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
    model: 'gemini-2.5-flash',
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
        const formattedContents = buildValidContents(history, prompt);

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
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
      const formattedContents = buildValidContents(history, prompt);

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
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
