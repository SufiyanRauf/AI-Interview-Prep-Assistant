import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedText } from '@/lib/embedding';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_STUDIO_API_KEY);
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const systemPrompt = `You are an interview coach who helps software engineering candidates prepare for technical interviews. You are talking directly to the candidate.

- Answer the candidate's questions directly and clearly. When they ask about a coding problem (for example "reverse a linked list in Python"), explain the approach in plain language and give clean, correct, well-commented code in a fenced code block.
- Cover algorithms, data structures, system design, and behavioral questions. For behavioral questions, suggest the STAR method (Situation, Task, Action, Result).
- When it helps, ask the candidate a practice question and then give specific feedback on their answer.
- Be encouraging, concise, and practical. Use short paragraphs and bullet points where they help.
- If you are not sure about something, say so plainly.

You are the coach the candidate is speaking with. Never refer them to a website, mobile app, troubleshooting page, support team, or human representative.`;

export async function POST(req) {
  const { messages, model = 'gemini-2.5-flash' } = await req.json();
  const lastMessage = messages[messages.length - 1];

  try {
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
    const vector = await embedText(lastMessage.content);

    const results = await pineconeIndex.query({
      vector,
      topK: 3,
      includeMetadata: true,
    });

    const context = results.matches.map(match => match.metadata.text).join('\n\n');
    const newSystemPrompt = `${systemPrompt}\n\nHere is some additional context that might be useful:\n\n${context}`;
    
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: newSystemPrompt,
    });
    
    const chatHistory = messages.slice(0, -1).filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.content !== "Hi there! I'm your AI Interview Prep Coach. How can I help you today?"));

    const chat = geminiModel.startChat({
      history: chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });
    
    let result;
    let attempts = 0;
    const maxAttempts = 4;

    // Retry transient model errors (overloaded / rate limited) with backoff
    while (attempts < maxAttempts) {
      try {
        result = await chat.sendMessageStream(lastMessage.content);
        break; // Success, exit the loop
      } catch (error) {
        const status = error?.status;
        const transient = status === 503 || status === 429 || status === 500 || status === undefined;
        if (transient && attempts < maxAttempts - 1) {
          console.log(`Transient model error (${status}), retrying in ${attempts + 1}s...`);
          await delay((attempts + 1) * 1000);
          attempts++;
        } else {
          throw error; // Non-transient error or out of attempts
        }
      }
    }
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      },
    });

    return new NextResponse(stream);

  } catch (error) {
    console.error("Error creating Google completion:", error);
    return NextResponse.json({ error: "Failed to process chat completion." }, { status: 500 });
  }
}