// OpenAI GPT API Integration (Optimized for low token usage)
const API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || "";
const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIResponse {
  choices?: {
    message?: {
      content?: string;
    };
    finish_reason?: string;
  }[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * Generate text content using OpenAI GPT API
 * @param prompt - The prompt to send to GPT
 * @param systemPrompt - Optional custom system prompt
 * @returns The generated text response
 */
export const generateText = async (prompt: string, systemPrompt?: string): Promise<string> => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cost-effective model with great performance
        messages: [
          {
            role: "system",
            content: systemPrompt || "You are a concise HR expert. Be brief but professional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 1500, // Reduced for cost optimization
      }),
    });

    const data: OpenAIResponse = await response.json();

    // Check for API errors
    if (data.error) {
      console.error("❌ OpenAI API Error:", data.error);
      throw new Error(data.error.message || "OpenAI API error occurred");
    }

    // Extract text from response
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("No response generated from OpenAI");
    }

    console.log("✅ OpenAI GPT response received successfully");
    return text;
  } catch (error: any) {
    console.error("❌ OpenAI API Error:", error);
    throw new Error(error.message || "Failed to generate content");
  }
};

/**
 * Generate text with streaming (simplified version)
 * @param prompt - The prompt to send to GPT
 * @param onChunk - Callback for each chunk (not used in basic mode, returns full response)
 */
export const generateTextStream = async (
  prompt: string,
  onChunk: (text: string) => void
): Promise<string> => {
  const text = await generateText(prompt);
  onChunk(text);
  return text;
};

/**
 * Chat session helper with conversation history
 */
export const sendChatMessage = async (
  history: { role: string; text: string }[],
  message: string
): Promise<string> => {
  try {
    // Convert history to OpenAI message format
    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful assistant.",
      },
      ...history.map((msg) => ({
        role: (msg.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: msg.text,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data: OpenAIResponse = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "OpenAI API error occurred");
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("No response generated from OpenAI");
    }

    return text;
  } catch (error: any) {
    console.error("❌ OpenAI Chat Error:", error);
    throw new Error(error.message || "Failed to send chat message");
  }
};

