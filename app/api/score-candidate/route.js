import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

export async function POST(request) {
  try {
    const { candidate, job, cvText } = await request.json()

    if (!candidate || !job) {
      return NextResponse.json(
        { error: "Candidate and job data are required" },
        { status: 400 }
      )
    }

    // Build concise prompt for token efficiency
    const prompt = `Score candidate for job. Return ONLY JSON: {"score":0-100,"reason":"brief reason"}

JOB:
Title: ${job.title}
Skills: ${(job.skills || []).slice(0, 10).join(", ")}
Experience: ${job.experience || "Not specified"}
Location: ${job.location || "Any"}

CANDIDATE:
Name: ${candidate.name}
Title: ${candidate.currentTitle || "N/A"}
Experience: ${candidate.experience || "N/A"}
Location: ${candidate.location || "N/A"}
Skills: ${(candidate.skills || []).slice(0, 10).join(", ")}
Education: ${candidate.education || "N/A"}

CV SUMMARY:
${cvText ? cvText.substring(0, 1500) : "No CV provided"}

Score based on: skill match (40%), experience fit (30%), education (15%), location (15%). Be strict but fair.`

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an HR scoring assistant. Return ONLY valid JSON with score (0-100) and brief reason. No markdown.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("OpenAI Error:", data.error)
      return NextResponse.json(
        { error: data.error.message || "AI scoring failed" },
        { status: 500 }
      )
    }

    const aiResponse = data.choices?.[0]?.message?.content || ""
    
    // Parse JSON from response
    let score = 0
    let reason = "Unable to score"
    
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        score = Math.min(100, Math.max(0, parseInt(parsed.score) || 0))
        reason = parsed.reason || "Scored by AI"
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError)
      // Try to extract just the score number
      const scoreMatch = aiResponse.match(/\d+/)
      if (scoreMatch) {
        score = Math.min(100, Math.max(0, parseInt(scoreMatch[0])))
      }
    }

    return NextResponse.json({
      success: true,
      score,
      reason,
      candidateId: candidate.applicantId,
    })
  } catch (error) {
    console.error("Scoring Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to score candidate" },
      { status: 500 }
    )
  }
}

