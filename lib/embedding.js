// Embeds text with Google's gemini-embedding-001 model.
// We request 768 dimensions so the output matches the Pinecone index,
// which was created at 768. The model defaults to 3072, so the
// outputDimensionality field is required.
export async function embedText(text) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GOOGLE_STUDIO_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-001',
            content: { parts: [{ text }] },
            outputDimensionality: 768,
          }),
        }
      );
    } catch (err) {
      // Network error: back off and retry, then give up
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
      throw err;
    }

    if (res.ok) {
      const data = await res.json();
      return data.embedding.values;
    }

    // Retry transient overload / rate-limit responses
    if ((res.status === 503 || res.status === 429) && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, attempt * 1000));
      continue;
    }

    throw new Error(`Embedding request failed: ${res.status} ${await res.text()}`);
  }
}
