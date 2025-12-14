import nodemailer from 'nodemailer'

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'talentedhub971@gmail.com',
    pass: process.env.EMAIL_PASS || 'fwzahfbawasxidyd',
  },
})

// Helper to generate reply info text
const getReplyInfo = (recruiterEmail, recruiterName) => {
  if (recruiterEmail) {
    return `<p style="font-size: 12px; color: #6b7280; margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 6px;">
      💬 <strong>Need to respond?</strong> Simply reply to this email - your message will be sent directly to ${recruiterName || 'the HR team'} at ${recruiterEmail}
    </p>`
  }
  return ''
}

// Email templates
const getEmailContent = (type, candidateName, jobTitle, companyName, interviewDetails = null, recruiterEmail = null, recruiterName = null, candidateEmail = null) => {
  switch (type) {
    case "shortlisted":
      return {
        subject: `🎉 Congratulations! You've been shortlisted for ${jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">You've been shortlisted!</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6;">We are pleased to inform you that you have been <strong style="color: #10b981;">shortlisted</strong> for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-weight: bold; color: #166534;">📋 What's next?</p>
                <p style="margin: 10px 0 0 0; color: #166534;">Our team will contact you soon to schedule an interview. Please keep an eye on your email and phone.</p>
              </div>
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
              ${getReplyInfo(recruiterEmail, recruiterName)}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #10b981;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "rejected":
      return {
        subject: `Application Update - ${jobTitle} at ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #6b7280; padding: 25px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Application Update</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6;">Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> and for taking the time to apply.</p>
              <p style="font-size: 16px; line-height: 1.6;">After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current requirements.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #374151;">We encourage you to apply for future opportunities at ${companyName}. We wish you the best in your career search.</p>
              </div>
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
              ${getReplyInfo(recruiterEmail, recruiterName)}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #6b7280;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "interview":
      const { type: interviewType, date, time, rawDate, rawTime, link, phone, location, notes } = interviewDetails || {}
      let meetingInfo = ""
      let meetingIcon = "📅"
      
      // Format date if it's in raw format (YYYY-MM-DD)
      let displayDate = date
      if (rawDate && !date.includes(",")) {
        const dateObj = new Date(rawDate)
        displayDate = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      }
      
      // Format time if it's in 24-hour format (HH:MM)
      let displayTime = time
      if (rawTime && !time.includes("AM") && !time.includes("PM")) {
        const [hours, minutes] = rawTime.split(":").map(Number)
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
        const ampm = hours < 12 ? "AM" : "PM"
        displayTime = `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`
      }
      
      if (interviewType === "google_meet") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📹 Google Meet:</strong> <a href="${link}" style="color: #8b5cf6;">${link}</a></p>`
        meetingIcon = "📹"
      } else if (interviewType === "zoom") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📹 Zoom Meeting:</strong> <a href="${link}" style="color: #8b5cf6;">${link}</a></p>`
        meetingIcon = "📹"
      } else if (interviewType === "phone") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📞 Phone Call:</strong> We will call you at your registered number${phone ? ` (${phone})` : ""}</p>`
        meetingIcon = "📞"
      } else if (interviewType === "onsite") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>🏢 Location:</strong> ${location || "Our office (details will be shared)"}</p>`
        meetingIcon = "🏢"
      }

      return {
        subject: `🗓️ Interview Scheduled - ${jobTitle} at ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🗓️ Interview Scheduled!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Great news! Your interview is confirmed.</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6;">We're excited to invite you for an interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!</p>
              
              <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #8b5cf6;">
                <h3 style="margin: 0 0 20px 0; color: #6d28d9; font-size: 18px;">${meetingIcon} Interview Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 100px;">📆 Date:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${displayDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">⏰ Time:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${displayTime}</td>
                  </tr>
                </table>
                ${meetingInfo}
                ${notes ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd6fe;"><p style="margin: 0; color: #6b7280;"><strong>📝 Notes:</strong> ${notes}</p></div>` : ""}
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Please reply to this email to confirm your attendance.</p>
              </div>
              
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
              ${getReplyInfo(recruiterEmail, recruiterName)}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #8b5cf6;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "hired":
      return {
        subject: `🎊 Welcome to ${companyName}! You're Hired!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 35px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px;">🎊 You're Hired!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 18px;">Welcome to the ${companyName} family!</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6;"><strong>Congratulations!</strong> 🎉 We are absolutely thrilled to offer you the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!</p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 2px solid #10b981;">
                <h2 style="margin: 0; color: #166534; font-size: 24px;">🚀 Welcome to the team!</h2>
                <p style="margin: 15px 0 0 0; color: #166534;">We can't wait to have you onboard!</p>
              </div>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-weight: bold; color: #166534;">📋 Next Steps:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #166534;">
                  <li>Our HR team will contact you within 24-48 hours</li>
                  <li>You'll receive your official offer letter</li>
                  <li>We'll share onboarding and joining details</li>
                </ul>
              </div>
              
              <p style="font-size: 16px;">Once again, congratulations on your new role!</p>
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
              ${getReplyInfo(recruiterEmail, recruiterName)}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #10b981;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "offer_letter":
      const offerDetails = interviewDetails // Reusing this parameter for offer details
      return {
        subject: `🎉 Official Offer Letter - ${jobTitle} at ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 35px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 16px;">You've received an official offer letter!</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Dear <strong>${candidateName}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6;">We are thrilled to extend an official offer for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!</p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4, #ccfbf1); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #047857; font-size: 18px;">📋 Offer Highlights</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">💼 Position:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${jobTitle}</td>
                  </tr>
                  ${offerDetails?.monthlySalary ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">💰 Monthly Salary:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${offerDetails.currency || 'AED'} ${offerDetails.monthlySalary}</td>
                  </tr>
                  ` : ''}
                  ${offerDetails?.joiningDate ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">📅 Joining Date:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${offerDetails.joiningDate}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>📌 Action Required:</strong> Please log in to your TalentHub dashboard to view the complete offer letter and respond.</p>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/applicant/applications" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Offer Letter</a>
              </div>
              
              <p style="font-size: 16px;">We look forward to welcoming you to the ${companyName} team!</p>
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
              ${getReplyInfo(recruiterEmail, recruiterName)}
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #10b981;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "offer_accepted":
      return {
        subject: `🎉 Great News! ${candidateName} Accepted the Offer - ${jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 35px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Offer Accepted!</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 16px;">Great news for ${companyName}!</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hello,</p>
              <p style="font-size: 16px; line-height: 1.6;">We're excited to inform you that <strong>${candidateName}</strong> has <strong style="color: #059669;">accepted</strong> the offer for the position of <strong>${jobTitle}</strong>!</p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #047857; font-size: 18px;">✅ Next Steps</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin-bottom: 8px;">Prepare onboarding documents</li>
                  <li style="margin-bottom: 8px;">Set up workspace and equipment</li>
                  <li style="margin-bottom: 8px;">Schedule orientation meeting</li>
                  <li style="margin-bottom: 8px;">Send welcome package</li>
                </ul>
              </div>
              
              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0; color: #1e40af;"><strong>📧 Candidate Contact:</strong> ${candidateEmail || 'Contact via TalentHub'}</p>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recruiter/candidates" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Candidate</a>
              </div>
              
              <p style="font-size: 16px;">Congratulations on your new hire!</p>
              <p style="font-size: 16px;">Best regards,<br/><strong>TalentHub Team</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #10b981;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    case "offer_declined":
      return {
        subject: `📋 Update: ${candidateName} Declined the Offer - ${jobTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 35px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📋 Offer Declined</h1>
              <p style="color: rgba(255,255,255,0.95); margin: 15px 0 0 0; font-size: 16px;">Update on ${jobTitle} position</p>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hello,</p>
              <p style="font-size: 16px; line-height: 1.6;">We wanted to inform you that <strong>${candidateName}</strong> has <strong style="color: #dc2626;">declined</strong> the offer for the position of <strong>${jobTitle}</strong>.</p>
              
              <div style="background: #fef2f2; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #991b1b;">While this candidate has chosen not to proceed, you have other qualified candidates in your pipeline.</p>
              </div>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <h3 style="margin: 0 0 15px 0; color: #047857; font-size: 18px;">💡 Suggested Next Steps</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151;">
                  <li style="margin-bottom: 8px;">Review other shortlisted candidates</li>
                  <li style="margin-bottom: 8px;">Consider candidates who performed well in interviews</li>
                  <li style="margin-bottom: 8px;">Extend offer to the next best candidate</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recruiter/candidates" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Other Candidates</a>
              </div>
              
              <p style="font-size: 16px;">Best regards,<br/><strong>TalentHub Team</strong></p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
              <p style="font-size: 12px; color: #6b7280; text-align: center;">
                TalentHub - Connecting Talent with Opportunity<br/>
                <a href="mailto:talentedhub971@gmail.com" style="color: #10b981;">talentedhub971@gmail.com</a>
              </p>
            </div>
          </div>
        `,
      }

    default:
      return null
  }
}

export async function POST(request) {
  try {
    const { type, to, candidateName, jobTitle, companyName, interviewDetails, recruiterEmail, recruiterName, candidateEmail } = await request.json()

    if (!type || !to || !candidateName || !jobTitle) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const emailContent = getEmailContent(type, candidateName, jobTitle, companyName || "Company", interviewDetails, recruiterEmail, recruiterName, candidateEmail)

    if (!emailContent) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Build mail options with Reply-To header for HR
    const mailOptions = {
      from: `TalentHub HR <talentedhub971@gmail.com>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    }

    // Set Reply-To to the actual HR/recruiter's email if provided
    // This ensures when candidate replies, it goes to the HR directly
    if (recruiterEmail) {
      const replyToName = recruiterName || companyName || "HR Team"
      mailOptions.replyTo = `${replyToName} <${recruiterEmail}>`
      
      // Also add recruiter as CC so they have a copy of the sent email
      // mailOptions.cc = recruiterEmail  // Uncomment if you want HR to get a copy
      
      console.log(`📧 Reply-To set to: ${recruiterEmail}`)
    }

    const info = await transporter.sendMail(mailOptions)

    console.log("✅ Email sent successfully:", info.messageId)
    console.log(`   → To: ${to}`)
    console.log(`   → Reply-To: ${recruiterEmail || "talentedhub971@gmail.com"}`)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully!", 
        messageId: info.messageId,
        replyTo: recruiterEmail || null
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("❌ Email error:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to send email" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
