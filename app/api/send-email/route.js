import nodemailer from 'nodemailer'

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'talentedhub971@gmail.com',
    pass: process.env.EMAIL_PASS || 'fwzahfbawasxidyd',
  },
})

// Email templates
const getEmailContent = (type, candidateName, jobTitle, companyName, interviewDetails = null) => {
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
      const { type: interviewType, date, time, link, phone, location, notes } = interviewDetails || {}
      let meetingInfo = ""
      let meetingIcon = "📅"
      
      if (interviewType === "google_meet") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📹 Google Meet:</strong> <a href="${link}" style="color: #8b5cf6;">${link}</a></p>`
        meetingIcon = "📹"
      } else if (interviewType === "zoom") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📹 Zoom Meeting:</strong> <a href="${link}" style="color: #8b5cf6;">${link}</a></p>`
        meetingIcon = "📹"
      } else if (interviewType === "phone") {
        meetingInfo = `<p style="margin: 8px 0;"><strong>📞 Phone Call:</strong> We will call you at your registered number</p>`
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
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">⏰ Time:</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #1f2937;">${time}</td>
                  </tr>
                </table>
                ${meetingInfo}
                ${notes ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd6fe;"><p style="margin: 0; color: #6b7280;"><strong>📝 Notes:</strong> ${notes}</p></div>` : ""}
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> Please reply to this email to confirm your attendance.</p>
              </div>
              
              <p style="font-size: 16px;">Best regards,<br/><strong>${companyName} HR Team</strong></p>
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
    const { type, to, candidateName, jobTitle, companyName, interviewDetails } = await request.json()

    if (!type || !to || !candidateName || !jobTitle) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const emailContent = getEmailContent(type, candidateName, jobTitle, companyName || "Company", interviewDetails)

    if (!emailContent) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    // Send email using Gmail SMTP
    const mailOptions = {
      from: `TalentHub HR <talentedhub971@gmail.com>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log("✅ Email sent successfully:", info.messageId)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email sent successfully!", 
        messageId: info.messageId 
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
