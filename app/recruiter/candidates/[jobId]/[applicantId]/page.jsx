"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { InterviewSchedulingDialog } from "@/components/interview-scheduling-dialog"
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Download,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  LinkIcon,
  FileText,
  Loader2,
  Star,
  ExternalLink,
  Building,
  Sparkles,
  Zap,
  Brain,
  Video,
} from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Cache key for localStorage
const SCORE_CACHE_KEY = "ai_candidate_scores"

export default function CandidateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [candidate, setCandidate] = useState(null)
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // AI Scoring states
  const [aiScore, setAiScore] = useState(null)
  const [isScoring, setIsScoring] = useState(false)
  
  // Shortlist confirmation dialog
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false)
  const [isShortlisting, setIsShortlisting] = useState(false)
  
  // Interview scheduling dialog
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false)

  // Get params values
  const jobId = params?.jobId
  const applicantId = params?.applicantId

  // Load cached score from localStorage
  const loadCachedScore = useCallback((jId, aId) => {
    try {
      const cached = localStorage.getItem(SCORE_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        const cacheKey = `${jId}_${aId}`
        if (parsed[cacheKey]) {
          return parsed[cacheKey]
        }
      }
    } catch (error) {
      console.error("Error loading cached score:", error)
    }
    return null
  }, [])

  // Save score to localStorage
  const saveCachedScore = useCallback((jId, aId, scoreData) => {
    try {
      const cached = localStorage.getItem(SCORE_CACHE_KEY)
      const parsed = cached ? JSON.parse(cached) : {}
      const cacheKey = `${jId}_${aId}`
      parsed[cacheKey] = scoreData
      localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(parsed))
    } catch (error) {
      console.error("Error saving cached score:", error)
    }
  }, [])

  // Parse PDF and get text (with fallback)
  const parsePDF = async (pdfUrl) => {
    try {
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      })
      const data = await response.json()
      if (data.success && data.text) {
        return data.text
      }
      // Fallback: return empty string if parsing fails
      console.log("PDF parsing failed, proceeding without CV text")
      return ""
    } catch (error) {
      console.error("PDF Parse Error:", error)
      // Continue scoring without CV text
      return ""
    }
  }

  // Score candidate with AI
  const scoreCandidate = async () => {
    if (!candidate || !job || isScoring) return
    
    setIsScoring(true)
    
    try {
      // Parse CV if available
      let cvText = ""
      if (candidate.resumeUrl) {
        toast({
          title: "Parsing CV...",
          description: "Extracting text from resume",
        })
        cvText = await parsePDF(candidate.resumeUrl)
      }

      toast({
        title: "AI Scoring...",
        description: "Analyzing candidate profile",
      })

      // Call scoring API
      const response = await fetch("/api/score-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            applicantId: candidate.applicantId,
            name: candidate.applicantName,
            currentTitle: candidate.currentTitle,
            experience: candidate.yearsOfExperience,
            location: candidate.applicantLocation,
            skills: candidate.skills,
            education: candidate.education,
          },
          job: {
            title: job.title,
            skills: job.skills,
            experience: job.experience,
            location: job.location,
            requirements: job.requirements,
          },
          cvText,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const scoreData = {
          score: data.score,
          reason: data.reason,
          timestamp: Date.now(),
        }
        
        // Update state
        setAiScore(scoreData)
        
        // Save to localStorage
        saveCachedScore(jobId, applicantId, scoreData)

        // Save to Firestore
        await saveScoreToFirestore(data.score, data.reason)

        toast({
          title: "AI Score Generated! 🎯",
          description: `Score: ${data.score}/100 - ${data.reason}`,
        })
      } else {
        throw new Error(data.error || "Scoring failed")
      }
    } catch (error) {
      console.error("Scoring Error:", error)
      toast({
        title: "Scoring Failed",
        description: error.message || "Failed to score candidate",
        variant: "destructive",
      })
    } finally {
      setIsScoring(false)
    }
  }

  // Save score to Firestore
  const saveScoreToFirestore = async (score, reason) => {
    try {
      const jobRef = doc(db, "jobs", jobId)
      const jobDoc = await getDoc(jobRef)
      
      if (jobDoc.exists()) {
        const jobData = jobDoc.data()
        const applicants = jobData.applicants || []
        
        const updatedApplicants = applicants.map(app => 
          app.applicantId === applicantId 
            ? { ...app, aiScore: score, aiScoreReason: reason, aiScoredAt: new Date().toISOString() }
            : app
        )
        
        await updateDoc(jobRef, { applicants: updatedApplicants })
      }
    } catch (error) {
      console.error("Error saving score to Firestore:", error)
    }
  }

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
    if (score >= 60) return "text-green-600 bg-green-500/10 border-green-500/30"
    if (score >= 40) return "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"
    if (score >= 20) return "text-orange-600 bg-orange-500/10 border-orange-500/30"
    return "text-red-600 bg-red-500/10 border-red-500/30"
  }

  // Fetch candidate and job data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        console.log("Fetching candidate data:", { jobId, applicantId })

        if (!jobId || !applicantId) {
          console.log("Missing params:", { jobId, applicantId })
          toast({
            title: "Invalid URL",
            description: "Missing job or applicant ID.",
            variant: "destructive",
          })
          router.push("/recruiter/candidates")
          return
        }

        // Load cached score first
        const cachedScore = loadCachedScore(jobId, applicantId)
        if (cachedScore) {
          setAiScore(cachedScore)
        }

        // Fetch job document
        const jobDoc = await getDoc(doc(db, "jobs", jobId))
        
        if (!jobDoc.exists()) {
          toast({
            title: "Job not found",
            description: "The job posting no longer exists.",
            variant: "destructive",
          })
          router.push("/recruiter/candidates")
          return
        }

        const jobData = jobDoc.data()
        setJob({
          id: jobDoc.id,
          title: jobData.jobtitle || jobData.title || "Untitled Job",
          companyName: jobData.companyName || "",
          location: jobData.location || "",
          type: jobData.type || "",
          salary: jobData.salary || "",
          skills: jobData.skills || [],
          experience: jobData.experience || "",
          requirements: jobData.requirements || [],
        })

        // Find the applicant in the job's applicants array
        const applicantsArray = jobData.applicants || []
        console.log("Applicants in job:", applicantsArray.length, "Looking for:", applicantId)
        const applicantData = applicantsArray.find(a => a.applicantId === applicantId)

        if (!applicantData) {
          toast({
            title: "Applicant not found",
            description: "This applicant may have withdrawn their application.",
            variant: "destructive",
          })
          router.push("/recruiter/candidates")
          return
        }

        setCandidate({
          ...applicantData,
          jobId: jobId,
        })

        // Check if score exists in Firestore (from previous scoring)
        if (applicantData.aiScore !== undefined && !cachedScore) {
          const scoreData = {
            score: applicantData.aiScore,
            reason: applicantData.aiScoreReason || "",
            timestamp: new Date(applicantData.aiScoredAt || Date.now()).getTime(),
          }
          setAiScore(scoreData)
          saveCachedScore(jobId, applicantId, scoreData)
        }

        console.log("✅ Candidate loaded:", applicantData.applicantName)

      } catch (error) {
        console.error("Error fetching candidate:", error)
        toast({
          title: "Error",
          description: "Failed to load candidate data.",
          variant: "destructive",
        })
        setIsLoading(false)
      } finally {
        setIsLoading(false)
      }
    }

    if (jobId && applicantId) {
      fetchData()
    }
  }, [jobId, applicantId, router, toast, loadCachedScore, saveCachedScore])

  // Update applicant status
  // Send email notification
  const sendEmail = async (type, candidateData, jobTitle, companyName, interviewDetails = null) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          to: candidateData.email,
          candidateName: candidateData.name,
          jobTitle,
          companyName: companyName || localStorage.getItem("companyName") || "Company",
          interviewDetails,
        }),
      })
      const data = await response.json()
      if (data.success) {
        console.log("Email sent:", data.message)
      }
    } catch (error) {
      console.error("Error sending email:", error)
    }
  }

  const updateStatus = async (newStatus, interviewDetails = null) => {
    if (!candidate || !job) return
    
    setIsUpdating(true)
    try {
      // Get current job document
      const jobDoc = await getDoc(doc(db, "jobs", job.id))
      if (!jobDoc.exists()) return

      const jobData = jobDoc.data()
      const applicants = jobData.applicants || []
      const companyName = jobData.companyName || localStorage.getItem("companyName") || "Company"
      const jobTitle = job.title || job.jobtitle || "Position"

      // Update the specific applicant's status
      const updatedApplicants = applicants.map(app =>
        app.applicantId === candidate.applicantId
          ? { 
              ...app, 
              status: newStatus, 
              updatedAt: new Date().toISOString(),
              ...(interviewDetails && { interviewDetails })
            }
          : app
      )

      await updateDoc(doc(db, "jobs", job.id), {
        applicants: updatedApplicants,
      })

      // Update local state
      setCandidate(prev => ({ ...prev, status: newStatus, interviewDetails }))

      // Send email based on status
      if (candidate.applicantEmail) {
        const emailCandidate = {
          name: candidate.applicantName,
          email: candidate.applicantEmail,
        }
        
        if (newStatus === "shortlisted") {
          sendEmail("shortlisted", emailCandidate, jobTitle, companyName)
        } else if (newStatus === "rejected") {
          sendEmail("rejected", emailCandidate, jobTitle, companyName)
        } else if (newStatus === "interview_scheduled" && interviewDetails) {
          sendEmail("interview", emailCandidate, jobTitle, companyName, interviewDetails)
        } else if (newStatus === "hired") {
          sendEmail("hired", emailCandidate, jobTitle, companyName)
        }
      }

      const statusMessages = {
        shortlisted: "🎉 Candidate shortlisted! Email notification sent.",
        rejected: "Candidate rejected. Email notification sent.",
        reviewed: "Candidate marked as reviewed.",
        interview_scheduled: "📅 Interview scheduled! Email sent to candidate.",
        hired: "🎊 Candidate hired! Congratulations email sent.",
      }
      
      toast({
        title: "Status Updated",
        description: statusMessages[newStatus] || `Status changed to ${getStatusLabel(newStatus)}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Schedule interview handler
  const handleScheduleInterview = async (interviewDetails) => {
    setIsSchedulingInterview(true)
    try {
      await updateStatus("interview_scheduled", interviewDetails)
      setInterviewDialogOpen(false)
    } finally {
      setIsSchedulingInterview(false)
    }
  }

  // Confirm shortlist with dialog
  const confirmShortlist = async () => {
    setIsShortlisting(true)
    try {
      await updateStatus("shortlisted")
      toast({
        title: "🎉 Candidate Shortlisted!",
        description: `${candidate?.applicantName} has been shortlisted. Congratulations email will be sent automatically.`,
      })
    } finally {
      setIsShortlisting(false)
      setShortlistDialogOpen(false)
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "applied":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "reviewed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
      case "shortlisted":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      case "interview_scheduled":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      case "hired":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    }
  }

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      applied: "Applied",
      reviewed: "Reviewed",
      shortlisted: "Shortlisted",
      interview_scheduled: "Interview Scheduled",
      hired: "Hired",
      rejected: "Rejected",
    }
    return labels[status] || status
  }

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "applied":
        return <Clock className="mr-1 h-3 w-3" />
      case "shortlisted":
        return <Star className="mr-1 h-3 w-3" />
      case "interview_scheduled":
        return <Calendar className="mr-1 h-3 w-3" />
      case "hired":
        return <CheckCircle2 className="mr-1 h-3 w-3" />
      case "rejected":
        return <XCircle className="mr-1 h-3 w-3" />
      default:
        return <Clock className="mr-1 h-3 w-3" />
    }
  }

  // Get education label
  const getEducationLabel = (edu) => {
    const labels = {
      "high-school": "High School",
      "associate": "Associate Degree",
      "bachelor": "Bachelor's Degree",
      "master": "Master's Degree",
      "phd": "Ph.D.",
      "bootcamp": "Coding Bootcamp",
      "self-taught": "Self-Taught",
    }
    return labels[edu] || edu || "Not specified"
  }

  // Get experience label
  const getExperienceLabel = (exp) => {
    const labels = {
      "0-1": "Less than 1 year",
      "1-2": "1-2 years",
      "3-5": "3-5 years",
      "5-7": "5-7 years",
      "7-10": "7-10 years",
      "10+": "10+ years",
    }
    return labels[exp] || exp || "Not specified"
  }

  // Format date
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Unknown"
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading candidate profile...</p>
        </div>
      </div>
    )
  }

  if (!candidate || !job) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Candidate Not Found</h3>
          <p className="mt-2 text-muted-foreground">This candidate data is unavailable.</p>
          <Button className="mt-4" onClick={() => router.push("/recruiter/candidates")}>
            Back to Candidates
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Candidates
        </Button>
        
        {/* AI Score Button */}
        {aiScore?.score === undefined && (
          <Button
            onClick={scoreCandidate}
            disabled={isScoring}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {isScoring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate AI Score
              </>
            )}
          </Button>
        )}
      </div>

      {/* AI Score Display Card */}
      {aiScore?.score !== undefined && (
        <Card className={`border-2 ${getScoreColor(aiScore.score)}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-5">
              {/* Score Circle */}
              <div className={`flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-full border-4 ${getScoreColor(aiScore.score)}`}>
                <Zap className="h-5 w-5" />
                <span className="text-2xl font-bold">{aiScore.score}</span>
              </div>
              
              {/* Score Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <h3 className="text-lg font-semibold text-foreground">AI Score</h3>
                  <Badge variant="outline" className="ml-1">
                    {aiScore.score >= 80 ? "Excellent Match" : 
                     aiScore.score >= 60 ? "Good Match" : 
                     aiScore.score >= 40 ? "Moderate Match" : 
                     aiScore.score >= 20 ? "Low Match" : "Poor Match"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{aiScore.reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Overview */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              {candidate.applicantAvatar ? (
                <AvatarImage src={candidate.applicantAvatar} />
              ) : (
                <AvatarImage src="/placeholder.svg?height=96&width=96" />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-2xl text-white">
                {candidate.applicantName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2) || "??"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground">{candidate.applicantName}</h1>
                    <Badge className={getStatusColor(candidate.status)} variant="outline">
                      {getStatusIcon(candidate.status)}
                      {getStatusLabel(candidate.status)}
                    </Badge>
                    {aiScore?.score !== undefined && (
                      <Badge className={`${getScoreColor(aiScore.score)} border`}>
                        <Zap className="mr-1 h-3 w-3" />
                        AI: {aiScore.score}%
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-medium text-muted-foreground">Applied for: {job.title}</p>
                  {candidate.currentTitle && (
                    <p className="text-muted-foreground">
                      {candidate.currentTitle} {candidate.currentCompany && `at ${candidate.currentCompany}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {candidate.applicantEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${candidate.applicantEmail}`} className="text-foreground hover:text-primary">
                      {candidate.applicantEmail}
                    </a>
                  </div>
                )}
                {candidate.applicantPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${candidate.applicantPhone}`} className="text-foreground hover:text-primary">
                      {candidate.applicantPhone}
                    </a>
                  </div>
                )}
                {candidate.applicantLocation && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{candidate.applicantLocation}</span>
                  </div>
                )}
                {candidate.yearsOfExperience && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{getExperienceLabel(candidate.yearsOfExperience)}</span>
                  </div>
                )}
                {candidate.appliedAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {formatDate(candidate.appliedAt)}</span>
                  </div>
                )}
                {candidate.expectedSalary && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs font-semibold text-primary">AED</span>
                    <span>Expected: {Number(candidate.expectedSalary).toLocaleString()}/mo</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {(candidate.status === "applied" || candidate.status === "reviewed") && (
                  <Button
                    variant="outline"
                    onClick={() => setShortlistDialogOpen(true)}
                    disabled={isUpdating || isShortlisting}
                    className="hover:bg-green-50 hover:text-green-600 hover:border-green-500"
                  >
                    {isShortlisting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                    {isShortlisting ? "Shortlisting..." : "Shortlist"}
                  </Button>
                )}
                
                {candidate.status === "shortlisted" && (
                  <Button
                    onClick={() => setInterviewDialogOpen(true)}
                    disabled={isUpdating || isSchedulingInterview}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90"
                  >
                    {isSchedulingInterview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                    {isSchedulingInterview ? "Scheduling..." : "Schedule Interview"}
                  </Button>
                )}
                
                {candidate.status === "interview_scheduled" && (
                  <Button
                    onClick={() => updateStatus("hired")}
                    disabled={isUpdating}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
                  >
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {isUpdating ? "Hiring..." : "Hire Candidate"}
                  </Button>
                )}

                {candidate.applicantEmail && (
                  <a href={`mailto:${candidate.applicantEmail}`}>
                    <Button variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Email
                    </Button>
                  </a>
                )}
                
                {candidate.resumeUrl && (
                  <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Resume
                    </Button>
                  </a>
                )}
                
                {candidate.status !== "rejected" && candidate.status !== "hired" && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
                    onClick={() => updateStatus("rejected")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    {isUpdating ? "Rejecting..." : "Reject"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Professional Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidate.currentTitle && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Current Role</h4>
                    <p className="text-sm text-muted-foreground">
                      {candidate.currentTitle} {candidate.currentCompany && `at ${candidate.currentCompany}`}
                    </p>
                  </div>
                )}
                {candidate.currentTitle && <Separator />}
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Experience Level</h4>
                  <p className="text-sm text-muted-foreground">
                    {getExperienceLabel(candidate.yearsOfExperience)}
                  </p>
                </div>
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Education</h4>
                  <p className="text-sm text-muted-foreground">
                    {getEducationLabel(candidate.education)}
                  </p>
                </div>
                
                {candidate.availability && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">Availability</h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {candidate.availability.replace(/_/g, " ")}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Online Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.linkedIn && (
                  <a
                    href={candidate.linkedIn.startsWith("http") ? candidate.linkedIn : `https://${candidate.linkedIn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    LinkedIn Profile
                  </a>
                )}
                {candidate.portfolio && (
                  <a
                    href={candidate.portfolio.startsWith("http") ? candidate.portfolio : `https://${candidate.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Portfolio Website
                  </a>
                )}
                {candidate.github && (
                  <a
                    href={candidate.github.startsWith("http") ? candidate.github : `https://${candidate.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-4 w-4" />
                    GitHub Profile
                  </a>
                )}
                {!candidate.linkedIn && !candidate.portfolio && !candidate.github && (
                  <p className="text-sm text-muted-foreground">No links provided</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Applied Job Info */}
          <Card>
            <CardHeader>
              <CardTitle>Applied Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{job.title}</h3>
                  {job.companyName && (
                    <p className="text-sm text-muted-foreground">{job.companyName}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                    {job.type && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{job.type}</span>
                      </>
                    )}
                    {job.salary && (
                      <>
                        <span>•</span>
                        <span>{job.salary}</span>
                      </>
                    )}
                  </div>
                </div>
                <Link href={`/recruiter/jobs/${job.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Job
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Experience</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.currentTitle || candidate.currentCompany ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                      <Building className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{candidate.currentTitle || "Current Position"}</h3>
                      {candidate.currentCompany && (
                        <p className="text-sm font-medium text-primary">{candidate.currentCompany}</p>
                      )}
                      {candidate.yearsOfExperience && (
                        <p className="text-sm text-muted-foreground">
                          {getExperienceLabel(candidate.yearsOfExperience)} of experience
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No work experience information provided.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{getEducationLabel(candidate.education)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.skills && candidate.skills.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-primary/10 text-primary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Matching skills with job */}
                  {job.skills && job.skills.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 font-semibold text-foreground">Skills Matching Job Requirements</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((jobSkill, index) => {
                            const isMatch = candidate.skills?.some(
                              s => s.toLowerCase() === jobSkill.toLowerCase()
                            )
                            return (
                              <Badge
                                key={index}
                                variant="secondary"
                                className={isMatch 
                                  ? "bg-green-500/10 text-green-700 border-green-500/20" 
                                  : "bg-muted text-muted-foreground"
                                }
                              >
                                {isMatch && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {jobSkill}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills listed.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="application" className="space-y-4">
          {/* Cover Letter */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Letter</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.coverLetter ? (
                <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                  {candidate.coverLetter}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No cover letter provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Resume */}
          <Card>
            <CardHeader>
              <CardTitle>Application Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {candidate.resumeUrl ? (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {candidate.resumeName || "Resume.pdf"}
                      </p>
                      <p className="text-sm text-muted-foreground">Uploaded CV/Resume</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </a>
                    <a href={candidate.resumeUrl} download>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No resume uploaded.</p>
              )}
            </CardContent>
          </Card>

          {/* Application Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                    <Clock className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Application Submitted</p>
                    <p className="text-sm text-muted-foreground">{formatDate(candidate.appliedAt)}</p>
                  </div>
                </div>
                
                {candidate.updatedAt && candidate.status !== "applied" && (
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getStatusColor(candidate.status)}`}>
                      {getStatusIcon(candidate.status)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Status: {getStatusLabel(candidate.status)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(candidate.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shortlist Confirmation Dialog */}
      <AlertDialog open={shortlistDialogOpen} onOpenChange={setShortlistDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <AlertDialogTitle>Shortlist Candidate</AlertDialogTitle>
                <AlertDialogDescription>
                  Confirm shortlisting this candidate
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          {candidate && (
            <div className="py-4">
              <div className="flex items-center gap-4 rounded-lg border bg-green-50 dark:bg-green-950/20 p-4">
                <Avatar className="h-14 w-14 border-2 border-green-500/30">
                  {candidate.applicantAvatar ? (
                    <AvatarImage src={candidate.applicantAvatar} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                      {candidate.applicantName?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{candidate.applicantName}</p>
                  <p className="text-sm text-muted-foreground">
                    {job?.title}
                  </p>
                  {candidate.applicantEmail && (
                    <p className="text-xs text-green-600 mt-1">
                      📧 {candidate.applicantEmail}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">What happens next:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Candidate status will be updated to "Shortlisted"
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-500" />
                    Congratulations email will be sent automatically
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isShortlisting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmShortlist}
              disabled={isShortlisting}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {isShortlisting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Shortlisting...
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Confirm Shortlist
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interview Scheduling Dialog */}
      <InterviewSchedulingDialog
        open={interviewDialogOpen}
        onOpenChange={setInterviewDialogOpen}
        candidate={candidate ? {
          name: candidate.applicantName,
          email: candidate.applicantEmail,
          phone: candidate.applicantPhone,
          avatar: candidate.applicantAvatar,
        } : null}
        jobTitle={job?.title || ""}
        onSchedule={handleScheduleInterview}
        isScheduling={isSchedulingInterview}
      />
    </div>
  )
}

