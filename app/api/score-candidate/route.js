import { NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

// Scoring weights - Skills and Experience focused (must total 100%)
const SCORING_WEIGHTS = {
  skillsMatch: 50,           // 50% - Technical skills, tools, frameworks, technologies
  experienceRelevance: 30,   // 30% - Years of experience, job relevance, industry experience
  practicalExposure: 10,     // 10% - Real projects, portfolio, GitHub, practical knowledge
  education: 10,             // 10% - Formal education (lowest priority)
}

// Validate and calculate data quality score
function calculateDataQuality(candidate, job, cvText) {
  let qualityScore = 0
  let maxScore = 0
  const missingFields = []

  // Job data quality (40% weight)
  maxScore += 40
  if (job.title && job.title.trim()) qualityScore += 10
  else missingFields.push("job title")
  
  if (job.skills && job.skills.length > 0) qualityScore += 15
  else missingFields.push("job required skills")
  
  if (job.description && job.description.trim().length > 50) qualityScore += 10
  else missingFields.push("job description")
  
  if (job.experience) qualityScore += 5
  else missingFields.push("job experience requirement")

  // Candidate data quality (40% weight)
  maxScore += 40
  if (candidate.name && candidate.name.trim()) qualityScore += 5
  else missingFields.push("candidate name")
  
  if (candidate.skills && candidate.skills.length > 0) qualityScore += 15
  else missingFields.push("candidate skills")
  
  if (candidate.experience) qualityScore += 10
  else missingFields.push("candidate experience")
  
  if (candidate.education) qualityScore += 5
  else missingFields.push("candidate education")
  
  if (candidate.currentTitle) qualityScore += 5
  else missingFields.push("candidate current title")

  // CV data quality (20% weight)
  maxScore += 20
  if (cvText && cvText.trim().length > 200) {
    qualityScore += 20
  } else if (cvText && cvText.trim().length > 50) {
    qualityScore += 10
    missingFields.push("detailed CV content")
  } else {
    missingFields.push("CV/resume content")
  }

  return {
    score: Math.round((qualityScore / maxScore) * 100),
    missingFields,
    isHighQuality: qualityScore >= 60,
  }
}

export async function POST(request) {
  try {
    const { candidate, job, cvText } = await request.json()

    if (!candidate || !job) {
      return NextResponse.json(
        { error: "Candidate and job data are required" },
        { status: 400 }
      )
    }

    // Calculate data quality
    const dataQuality = calculateDataQuality(candidate, job, cvText)

    // System prompt with SKILLS-FOCUSED evaluation
    const systemPrompt = `You are an expert AI recruitment screening assistant specializing in skills-based hiring. Your primary focus is evaluating candidates based on their PRACTICAL SKILLS, REAL EXPERIENCE, and HANDS-ON EXPERTISE rather than formal education.

## CRITICAL SCORING PHILOSOPHY

**SKILLS AND EXPERIENCE OVER EDUCATION**
- A candidate with strong practical skills and relevant experience should score higher than one with matching education but weak skills
- NEVER inflate scores just because education requirements match
- Formal education is the LOWEST priority factor
- Real-world experience, projects, and technical proficiency are what matter most

## SCORING WEIGHTS (Strictly enforce these)

1. **Skills Match: ${SCORING_WEIGHTS.skillsMatch}% (HIGHEST PRIORITY)**
   - Technical skills alignment (programming languages, frameworks, tools)
   - Soft skills relevant to the role
   - Industry-specific expertise
   - Tools and technologies mentioned in CV
   - Certifications and specialized training
   
2. **Experience Relevance: ${SCORING_WEIGHTS.experienceRelevance}% (HIGH PRIORITY)**
   - Years of relevant work experience
   - Industry/domain experience
   - Job title progression and career growth
   - Relevance of past roles to current position
   - Responsibilities that match job requirements
   
3. **Practical Exposure: ${SCORING_WEIGHTS.practicalExposure}% (MEDIUM PRIORITY)**
   - Real projects mentioned in CV or portfolio
   - GitHub/code repositories
   - Hands-on project experience
   - Problem-solving evidence
   - Practical application of skills
   
4. **Education: ${SCORING_WEIGHTS.education}% (LOWEST PRIORITY)**
   - Only consider if directly relevant
   - DO NOT over-score for matching degree
   - A strong skill/experience profile beats a matching degree
   - Consider bootcamps and self-taught equally valid if skills are proven

## SCORING GUIDELINES

- 90-100: Exceptional skills match, extensive relevant experience, proven practical work
- 75-89: Strong skills alignment, good experience, demonstrated practical ability
- 60-74: Good skills match, adequate experience, some practical exposure
- 45-59: Moderate skills, limited relevant experience, education may compensate slightly
- 30-44: Weak skills match despite potentially matching education
- 0-29: Poor skills alignment, insufficient experience regardless of education

## ANTI-PATTERNS TO AVOID

❌ DO NOT give high scores to candidates who:
- Have matching degree but weak/irrelevant skills
- Lack hands-on experience despite formal education
- Cannot demonstrate practical application of knowledge
- Have outdated skills even with relevant degree

✅ DO give high scores to candidates who:
- Have strong, relevant technical skills
- Show proven work experience in similar roles
- Demonstrate practical projects and real-world applications
- Are self-taught or bootcamp graduates with excellent skills
- Have less formal education but extensive practical expertise

## RESPONSE FORMAT (Return ONLY this JSON structure)

{
  "matchScore": <number 0-100>,
  "confidence": <number 85-100>,
  "breakdown": {
    "skillsMatch": {"score": <0-100>, "weight": ${SCORING_WEIGHTS.skillsMatch}, "weighted": <calculated>, "details": "<specific skills that matched or were missing>"},
    "experienceRelevance": {"score": <0-100>, "weight": ${SCORING_WEIGHTS.experienceRelevance}, "weighted": <calculated>, "details": "<experience relevance assessment>"},
    "practicalExposure": {"score": <0-100>, "weight": ${SCORING_WEIGHTS.practicalExposure}, "weighted": <calculated>, "details": "<projects and practical work found>"},
    "education": {"score": <0-100>, "weight": ${SCORING_WEIGHTS.education}, "weighted": <calculated>, "details": "<education assessment - remember this is lowest priority>"}
  },
  "explanation": "<2-3 sentence summary focusing on HOW skills and experience influenced the score>",
  "strengths": ["<strength 1 - focus on skills/experience>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1 - focus on skill/experience gaps>", "<concern 2>"],
  "recommendation": "<STRONG_MATCH | GOOD_MATCH | CONSIDER | NOT_RECOMMENDED>",
  "skillsAnalysis": "<detailed analysis of technical skills match>",
  "experienceAnalysis": "<detailed analysis of work experience relevance>",
  "educationNote": "<brief note on education - explain why it did or did not significantly impact score>"
}

## CALCULATION METHOD

matchScore = (skillsMatch.score × 0.50) + (experienceRelevance.score × 0.30) + (practicalExposure.score × 0.10) + (education.score × 0.10)

## CONFIDENCE SCORE (85-100%)
- 95-100%: Complete skills and experience data available
- 90-94%: Good skills data, some experience details
- 85-89%: Sufficient data for reliable skills-based evaluation

Remember: A candidate with a matching degree but poor skills should score LOWER than a self-taught developer with excellent skills and proven experience.`

    // Format job skills
    const jobSkillsList = job.skills && job.skills.length > 0
      ? job.skills.join(", ")
      : "Not specified"

    // Format candidate skills
    const candidateSkillsList = candidate.skills && candidate.skills.length > 0
      ? candidate.skills.join(", ")
      : "Not provided"

    // Format job requirements
    const jobRequirementsList = job.requirements && job.requirements.length > 0
      ? job.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "Not specified"

    // Clean and truncate CV text
    const cleanedCvText = cvText 
      ? cvText.trim().replace(/\s+/g, ' ').substring(0, 4000)
      : ""

    // Build the evaluation request
    const userPrompt = `## SKILLS-FOCUSED CANDIDATE SCREENING

### DATA QUALITY: ${dataQuality.score}%
${dataQuality.missingFields.length > 0 ? `Missing: ${dataQuality.missingFields.join(", ")}` : "All critical data available"}

---

### JOB REQUIREMENTS

**Title:** ${job.title || "Not specified"}
**Company:** ${job.company || "Not specified"}
**Department:** ${job.department || "Not specified"}
**Location:** ${job.location || "Not specified"}
**Employment Type:** ${job.type || "Not specified"}
**Required Experience:** ${job.experience || "Not specified"}
**Salary Range:** ${job.salary || "Not specified"}

**REQUIRED SKILLS (Most Important):**
${jobSkillsList}

**Job Description:**
${job.description || "Not provided"}

**Additional Requirements:**
${jobRequirementsList}

---

### CANDIDATE PROFILE

**Name:** ${candidate.name || "Unknown"}
**Current Title:** ${candidate.currentTitle || "Not provided"}
**Current Company:** ${candidate.currentCompany || "Not provided"}
**Years of Experience:** ${candidate.experience || "Not provided"}
**Location:** ${candidate.location || "Not provided"}
**Education Level:** ${candidate.education || "Not provided"}
**Availability:** ${candidate.availability || "Not specified"}
**Expected Salary:** ${candidate.expectedSalary ? `AED ${candidate.expectedSalary}/month` : "Not specified"}

**CANDIDATE SKILLS (Evaluate These Carefully):**
${candidateSkillsList}

**Professional Links (Check for practical work):**
- LinkedIn: ${candidate.linkedIn || "Not provided"}
- Portfolio: ${candidate.portfolio || "Not provided"}
- GitHub: ${candidate.github || "Not provided"}

**Cover Letter:**
${candidate.coverLetter || "Not provided"}

---

### CV/RESUME (Extract skills, experience, and projects)
${cleanedCvText || "No CV content available"}

---

### EVALUATION INSTRUCTIONS

1. **FIRST**: Analyze the candidate's SKILLS - do they match what the job requires?
2. **SECOND**: Evaluate WORK EXPERIENCE - is it relevant to this role?
3. **THIRD**: Look for PRACTICAL PROJECTS - any GitHub, portfolio, or real-world work?
4. **LAST**: Consider EDUCATION - but do NOT let it dominate the score

**Key Questions to Answer:**
- Does the candidate have the technical skills needed for this job?
- Is their work experience relevant to this position?
- Can they demonstrate practical application of their skills?
- Would a skills-focused hiring manager be impressed by this candidate?

**Remember:** 
- A bootcamp graduate with excellent skills > A degree holder with weak skills
- 5 years of relevant experience > A matching degree with 1 year experience
- Strong GitHub portfolio > Impressive university name

Return ONLY the JSON response with skills and experience as the primary score drivers.`

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
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
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
    
    // Parse the JSON response
    let result = {
      score: 0,
      confidence: 85,
      breakdown: {
        skillsMatch: { score: 0, weight: SCORING_WEIGHTS.skillsMatch, weighted: 0, details: "" },
        experienceRelevance: { score: 0, weight: SCORING_WEIGHTS.experienceRelevance, weighted: 0, details: "" },
        practicalExposure: { score: 0, weight: SCORING_WEIGHTS.practicalExposure, weighted: 0, details: "" },
        education: { score: 0, weight: SCORING_WEIGHTS.education, weighted: 0, details: "" },
      },
      explanation: "Unable to generate evaluation",
      strengths: [],
      concerns: [],
      recommendation: "NOT_RECOMMENDED",
      skillsAnalysis: "",
      experienceAnalysis: "",
      educationNote: "",
    }
    
    try {
      const parsed = JSON.parse(aiResponse)
      
      // Extract match score
      result.score = Math.min(100, Math.max(0, parseInt(parsed.matchScore) || 0))
      
      // Extract confidence (85-100)
      const rawConfidence = parseInt(parsed.confidence) || 85
      result.confidence = Math.min(100, Math.max(85, rawConfidence))
      
      // Extract breakdown scores
      if (parsed.breakdown) {
        result.breakdown = {
          skillsMatch: {
            score: Math.min(100, Math.max(0, parseInt(parsed.breakdown.skillsMatch?.score) || 0)),
            weight: SCORING_WEIGHTS.skillsMatch,
            weighted: 0,
            details: parsed.breakdown.skillsMatch?.details || "",
          },
          experienceRelevance: {
            score: Math.min(100, Math.max(0, parseInt(parsed.breakdown.experienceRelevance?.score) || 0)),
            weight: SCORING_WEIGHTS.experienceRelevance,
            weighted: 0,
            details: parsed.breakdown.experienceRelevance?.details || "",
          },
          practicalExposure: {
            score: Math.min(100, Math.max(0, parseInt(parsed.breakdown.practicalExposure?.score) || 0)),
            weight: SCORING_WEIGHTS.practicalExposure,
            weighted: 0,
            details: parsed.breakdown.practicalExposure?.details || "",
          },
          education: {
            score: Math.min(100, Math.max(0, parseInt(parsed.breakdown.education?.score) || 0)),
            weight: SCORING_WEIGHTS.education,
            weighted: 0,
            details: parsed.breakdown.education?.details || "",
          },
        }
        
        // Calculate weighted scores using skills-focused weights
        result.breakdown.skillsMatch.weighted = Math.round(result.breakdown.skillsMatch.score * (SCORING_WEIGHTS.skillsMatch / 100))
        result.breakdown.experienceRelevance.weighted = Math.round(result.breakdown.experienceRelevance.score * (SCORING_WEIGHTS.experienceRelevance / 100))
        result.breakdown.practicalExposure.weighted = Math.round(result.breakdown.practicalExposure.score * (SCORING_WEIGHTS.practicalExposure / 100))
        result.breakdown.education.weighted = Math.round(result.breakdown.education.score * (SCORING_WEIGHTS.education / 100))
        
        // Recalculate total score from breakdown
        const calculatedScore = 
          result.breakdown.skillsMatch.weighted +
          result.breakdown.experienceRelevance.weighted +
          result.breakdown.practicalExposure.weighted +
          result.breakdown.education.weighted
        
        // Use calculated score for accuracy
        if (Math.abs(result.score - calculatedScore) > 5) {
          result.score = calculatedScore
        }
      }
      
      // Extract other fields
      result.explanation = parsed.explanation || "Evaluation completed based on skills and experience analysis."
      result.strengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : []
      result.concerns = Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : []
      result.recommendation = parsed.recommendation || (result.score >= 75 ? "STRONG_MATCH" : result.score >= 60 ? "GOOD_MATCH" : result.score >= 45 ? "CONSIDER" : "NOT_RECOMMENDED")
      result.skillsAnalysis = parsed.skillsAnalysis || ""
      result.experienceAnalysis = parsed.experienceAnalysis || ""
      result.educationNote = parsed.educationNote || ""
      
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError)
      const scoreMatch = aiResponse.match(/matchScore["\s:]+(\d+)/i)
      if (scoreMatch) {
        result.score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])))
      }
      result.confidence = 85
    }

    return NextResponse.json({
      success: true,
      score: result.score,
      confidence: result.confidence,
      breakdown: result.breakdown,
      explanation: result.explanation,
      strengths: result.strengths,
      concerns: result.concerns,
      recommendation: result.recommendation,
      skillsAnalysis: result.skillsAnalysis,
      experienceAnalysis: result.experienceAnalysis,
      educationNote: result.educationNote,
      dataQuality: dataQuality.score,
      candidateId: candidate.applicantId,
      scoredAt: new Date().toISOString(),
      scoringWeights: SCORING_WEIGHTS,
    })
  } catch (error) {
    console.error("Scoring Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to score candidate" },
      { status: 500 }
    )
  }
}
