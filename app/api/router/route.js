import { NextResponse } from 'next/server';

// The router forwards the conversation to the chat endpoint. It used to
// classify code vs conversation and pick a different model, but both
// paths now use gemini-2.5-flash, so the extra classification call was
// just burning free-tier quota. Forwarding directly keeps it free.
export async function POST(req) {
  const { messages } = await req.json();

  try {
    const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model: 'gemini-2.5-flash' }),
    });

    return new NextResponse(chatResponse.body, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error("Error in router:", error);
    return NextResponse.json({ error: "Failed to route request." }, { status: 500 });
  }
}
