"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadResume } from "@/lib/supabase"

export default function ApplyJobPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [job, setJob] = useState(null)
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState(null)
  const [isUploadingCV, setIsUploadingCV] = useState(false)
  const [resumeUrl, setResumeUrl] = useState("")
  const [resumeName, setResumeName] = useState("")
  const [userId, setUserId] = useState(null)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    company: "",
    experience: "",
    education: "bachelor",
    availability: "2weeks",
    expectedSalary: "",
    coverLetter: "",
    linkedIn: "",
    portfolio: "",
    github: "",
  })

  // Get experience label from experienceLevel
  const getExperienceFromLevel = (level) => {
    const mapping = {
      entry: "0-1",
      mid: "1-2",
      senior: "5-7",
      lead: "7-10",
      executive: "10+",
    }
    return mapping[level] || ""
  }

  // Fetch job and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Get user data
        const uid = localStorage.getItem("userId")
        if (!uid) {
          setError("Please login to apply for jobs")
          setIsLoading(false)
          return
        }
        setUserId(uid)

        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", uid))
        if (userDoc.exists()) {
          const user = userDoc.data()
          setUserData(user)
          
          // Set resume from profile if exists
          if (user.resumeUrl) {
            setResumeUrl(user.resumeUrl)
            setResumeName(user.resumeName || "Resume.pdf")
          }
          
          // Get most recent experience from profile
          let recentCompany = ""
          let recentTitle = user.professionalTitle || ""
          if (user.experiences && user.experiences.length > 0) {
            const latestExp = user.experiences[0] // Assume first is most recent
            recentCompany = latestExp.company || ""
            if (latestExp.title) {
              recentTitle = latestExp.title
            }
          }
          
          // Pre-fill form with user data
          const nameParts = (user.name || "").split(" ")
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user.email || "",
            phone: user.phone || "",
            location: user.location || "",
            currentTitle: recentTitle,
            company: recentCompany,
            experience: getExperienceFromLevel(user.experienceLevel),
            linkedIn: user.linkedIn || "",
            portfolio: user.portfolio || "",
            github: user.github || "",
            availability: user.noticePeriod || "2weeks",
            expectedSalary: user.expectedSalaryMin?.toString() || "",
          }))
        }

        // Fetch job data
        const jobDoc = await getDoc(doc(db, "jobs", params.id))
        if (!jobDoc.exists()) {
          setError("Job not found")
          setIsLoading(false)
          return
        }

        const jobData = jobDoc.data()
        if (jobData.status !== "active") {
          setError("This job is no longer accepting applications")
          setIsLoading(false)
          return
        }

        setJob({
          id: jobDoc.id,
          title: jobData.jobtitle || jobData.title || "Untitled Job",
          company: jobData.companyName || "Company",
          location: jobData.location || "Not specified",
          salary: jobData.salary || "Competitive",
          type: jobData.type || "Full-time",
          recruiterId: jobData.recruiterId,
          recruiterEmail: jobData.recruiterEmail,
          department: jobData.department,
        })

        setIsLoading(false)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load job details")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!job || !userData) {
      toast({
        title: "Error",
        description: "Missing required data. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const currentUserId = localStorage.getItem("userId")
      
      // Check if user already applied
      const jobDoc = await getDoc(doc(db, "jobs", job.id))
      const jobData = jobDoc.data()
      const existingApplicants = jobData.applicants || []
      
      const alreadyApplied = existingApplicants.some(
        (applicant) => applicant.applicantId === currentUserId
      )
      
      if (alreadyApplied) {
        toast({
          title: "Already Applied",
          description: "You have already applied for this position.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }
      
      // Create applicant data object to push into the job's applicants array
      const applicantData = {
        // Applicant info
        applicantId: currentUserId,
        applicantName: `${formData.firstName} ${formData.lastName}`.trim(),
        applicantEmail: formData.email,
        applicantPhone: formData.phone,
        applicantLocation: formData.location,
        applicantAvatar: userData.avatarUrl || null,
        
        // Professional info
        currentTitle: formData.currentTitle,
        currentCompany: formData.company,
        yearsOfExperience: formData.experience,
        education: formData.education,
        skills: userData.skills || [],
        
        // Preferences
        availability: formData.availability,
        expectedSalary: formData.expectedSalary ? parseInt(formData.expectedSalary) : null,
        
        // Links
        linkedIn: formData.linkedIn,
        portfolio: formData.portfolio,
        github: formData.github,
        
        // Cover letter
        coverLetter: formData.coverLetter,
        
        // Resume/CV
        resumeUrl: resumeUrl || null,
        resumeName: resumeName || null,
        
        // Status
        status: "applied", // applied, reviewed, interview_scheduled, rejected, hired
        
        // Timestamp (use ISO string since arrayUnion doesn't support serverTimestamp)
        appliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Push applicant data into the job's applicants array
      await updateDoc(doc(db, "jobs", job.id), {
        applicants: arrayUnion(applicantData),
      })
      
      console.log("✅ Application submitted to job:", job.id)

      toast({
        title: "🎉 Application Submitted!",
        description: `Your application for ${job.title} has been sent successfully.`,
      })

      // Redirect to applications page
      setTimeout(() => {
        router.push("/applicant/applications?success=true")
      }, 1500)

    } catch (error) {
      console.error("❌ Error submitting application:", error)
      toast({
        title: "Failed to submit application",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  // Handle CV upload
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!userId) {
      toast({
        title: "Error",
        description: "Please login to upload your CV.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingCV(true)
    try {
      const url = await uploadResume(userId, file)
      
      // Save to Firebase profile
      await updateDoc(doc(db, "users", userId), {
        resumeUrl: url,
        resumeName: file.name,
        updatedAt: serverTimestamp(),
      })

      // Update local state
      setResumeUrl(url)
      setResumeName(file.name)
      setUserData(prev => ({
        ...prev,
        resumeUrl: url,
        resumeName: file.name,
      }))

      toast({
        title: "✅ CV Uploaded!",
        description: "Your resume has been saved to your profile.",
      })
    } catch (error) {
      console.error("CV upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload CV.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCV(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading application form...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/applicant/jobs">
          <Button variant="ghost" size="sm">
            ← Back to Jobs
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">{error}</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Please check if you're logged in and the job is still available.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/applicant/jobs">
                <Button>Browse Jobs</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline">Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back Button */}
      <Link href={`/applicant/jobs/${params.id}`}>
        <Button variant="ghost" size="sm">
          ← Back to Job Details
        </Button>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Apply for Position</h1>
        <p className="mt-2 text-muted-foreground">Complete the application form to apply for this position</p>
      </div>

      {/* Job Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary font-bold text-lg">
              {job?.company?.charAt(0) || "C"}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">{job?.title}</h3>
              <p className="text-muted-foreground">{job?.company}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{job?.type}</Badge>
                <Badge variant="secondary">{job?.location}</Badge>
                <Badge variant="secondary">{job?.salary}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic information about yourself</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    className="pl-9"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Current Location *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  className="pl-9"
                  required
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Experience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Experience
            </CardTitle>
            <CardDescription>Tell us about your work experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentTitle">Current/Most Recent Title *</Label>
                <Input
                  id="currentTitle"
                  required
                  placeholder="e.g. Software Engineer"
                  value={formData.currentTitle}
                  onChange={(e) => handleChange("currentTitle", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Current or previous company"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">Years of Experience *</Label>
              <Select value={formData.experience} onValueChange={(value) => handleChange("experience", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-1">Less than 1 year</SelectItem>
                  <SelectItem value="1-2">1-2 years</SelectItem>
                  <SelectItem value="3-5">3-5 years</SelectItem>
                  <SelectItem value="5-7">5-7 years</SelectItem>
                  <SelectItem value="7-10">7-10 years</SelectItem>
                  <SelectItem value="10+">10+ years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Education
            </CardTitle>
            <CardDescription>Your educational background</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="education">Highest Level of Education *</Label>
              <Select value={formData.education} onValueChange={(value) => handleChange("education", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="associate">Associate Degree</SelectItem>
                  <SelectItem value="bachelor">Bachelor&apos;s Degree</SelectItem>
                  <SelectItem value="master">Master&apos;s Degree</SelectItem>
                  <SelectItem value="phd">Ph.D.</SelectItem>
                  <SelectItem value="bootcamp">Coding Bootcamp</SelectItem>
                  <SelectItem value="self-taught">Self-Taught</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Help us understand your preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="availability">Availability to Start *</Label>
                <Select value={formData.availability} onValueChange={(value) => handleChange("availability", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                    <SelectItem value="2weeks">2 weeks</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="2months">2 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedSalary">Expected Salary (Monthly AED)</Label>
                <Input
                  id="expectedSalary"
                  type="number"
                  placeholder="e.g. 10000"
                  value={formData.expectedSalary}
                  onChange={(e) => handleChange("expectedSalary", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Links</CardTitle>
            <CardDescription>Share your online profiles and portfolio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn Profile</Label>
              <Input
                id="linkedIn"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={formData.linkedIn}
                onChange={(e) => handleChange("linkedIn", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio Website</Label>
              <Input
                id="portfolio"
                type="url"
                placeholder="https://yourportfolio.com"
                value={formData.portfolio}
                onChange={(e) => handleChange("portfolio", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub Profile</Label>
              <Input
                id="github"
                type="url"
                placeholder="https://github.com/username"
                value={formData.github}
                onChange={(e) => handleChange("github", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Cover Letter */}
        <Card>
          <CardHeader>
            <CardTitle>Cover Letter</CardTitle>
            <CardDescription>Tell us why you're a great fit for this role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Your Message</Label>
              <Textarea
                id="coverLetter"
                placeholder="Explain why you're interested in this position and what makes you a great candidate..."
                rows={6}
                value={formData.coverLetter}
                onChange={(e) => handleChange("coverLetter", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional but highly recommended</p>
            </div>
          </CardContent>
        </Card>

        {/* Resume/CV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resume / CV
            </CardTitle>
            <CardDescription>Attach your resume to strengthen your application</CardDescription>
          </CardHeader>
          <CardContent>
            {resumeUrl ? (
              <div className="space-y-4">
                {/* CV Attached - Show preview */}
                <div className="flex items-center gap-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{resumeName}</p>
                    <p className="text-sm text-green-600">✓ Ready to submit with application</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </a>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleCVUpload}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={isUploadingCV}
                      />
                      <Button type="button" variant="outline" size="sm" disabled={isUploadingCV}>
                        {isUploadingCV ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Replace
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This CV from your profile will be attached to your application
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* No CV - Show upload option */}
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleCVUpload}
                    className="absolute inset-0 cursor-pointer opacity-0 z-10"
                    disabled={isUploadingCV}
                  />
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary hover:bg-primary/5">
                    {isUploadingCV ? (
                      <>
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading your resume...</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-foreground">Upload your resume</p>
                          <p className="text-sm text-muted-foreground">
                            Drag and drop or click to browse
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Accepted formats: PDF, DOC, DOCX • Max size: 10MB • Will be saved to your profile
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Application Review</p>
                    <p>
                      Your application will be reviewed by the hiring team. You'll receive email updates
                      about your application status.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <Link href={`/applicant/jobs/${params.id}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
