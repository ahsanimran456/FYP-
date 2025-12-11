import { NextResponse } from "next/server"
import { extractText } from "unpdf"

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { pdfUrl } = await request.json()

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "PDF URL is required" },
        { status: 400 }
      )
    }

    // Fetch PDF from URL
    const pdfResponse = await fetch(pdfUrl)
    
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PDF from URL" },
        { status: 400 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    
    // Parse PDF using unpdf
    const result = await extractText(pdfBuffer)
    
    // Handle different return formats from unpdf
    let rawText = ""
    if (typeof result === "string") {
      rawText = result
    } else if (result && typeof result.text === "string") {
      rawText = result.text
    } else if (result && Array.isArray(result.text)) {
      rawText = result.text.join(" ")
    } else if (result && result.pages && Array.isArray(result.pages)) {
      rawText = result.pages.map(p => p.text || "").join(" ")
    } else {
      rawText = String(result || "")
    }
    
    // Clean and limit text (to save tokens)
    let extractedText = rawText
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 4000)

    return NextResponse.json({
      success: true,
      text: extractedText,
      pages: result?.totalPages || 1,
    })
  } catch (error) {
    console.error("PDF Parse Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to parse PDF" },
      { status: 500 }
    )
  }
}

