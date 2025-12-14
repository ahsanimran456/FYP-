import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

export async function POST(request) {
  try {
    const { candidate, jobTitle, companyName, offerDetails } = await request.json()

    if (!candidate || !jobTitle || !companyName || !offerDetails) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Format joining date
    const joiningDate = new Date(offerDetails.joiningDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Build the prompt
    const systemPrompt = `You are a professional HR assistant specializing in creating formal offer letters. 
Generate a professional, warm, and comprehensive offer letter that is legally appropriate for the UAE job market.
The letter should be formal yet welcoming, and clearly outline all terms of employment.
Do NOT include any placeholder brackets like [Name] - use the actual values provided.
Do NOT include a company letterhead or date - those will be added separately.
Start directly with the salutation.`

    const userPrompt = `Create a professional offer letter with the following details:

CANDIDATE INFORMATION:
- Name: ${candidate.name}
- Email: ${candidate.email}

POSITION:
- Job Title: ${jobTitle}
- Company: ${companyName}

COMPENSATION:
- Monthly Salary: ${offerDetails.currency} ${offerDetails.monthlySalary}
${offerDetails.bonuses ? `- Bonuses/Allowances: ${offerDetails.bonuses}` : ''}

EMPLOYMENT TERMS:
- Joining Date: ${joiningDate}
- Probation Period: ${offerDetails.probationPeriod}
- Working Hours: ${offerDetails.workingHours}
- Working Days: ${offerDetails.workingDays}

LEAVE ENTITLEMENTS:
- Annual Leave: ${offerDetails.annualLeave} days per year
- Sick Leave: ${offerDetails.sickLeave} days per year

${offerDetails.benefits ? `BENEFITS & PERKS:\n${offerDetails.benefits}` : ''}

${offerDetails.additionalTerms ? `ADDITIONAL TERMS:\n${offerDetails.additionalTerms}` : ''}

Please generate a professional offer letter that:
1. Starts with a warm congratulatory greeting
2. Clearly states the position being offered
3. Details the compensation package
4. Outlines working hours and schedule
5. Lists leave entitlements
6. Mentions benefits if provided
7. States the probation period
8. Includes acceptance instructions (reply to this letter or email)
9. Ends with a professional closing
10. Includes a signature block for the HR Manager/Director

Make it professional, clear, and appropriate for the UAE employment market.`

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("OpenAI Error:", data.error)
      return NextResponse.json(
        { error: data.error.message || "AI generation failed" },
        { status: 500 }
      )
    }

    const letter = data.choices?.[0]?.message?.content || ""

    return NextResponse.json({
      success: true,
      letter,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Offer Letter Generation Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate offer letter" },
      { status: 500 }
    )
  }
}
