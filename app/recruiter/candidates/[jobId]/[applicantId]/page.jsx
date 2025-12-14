"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
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
  Zap,
  Brain,
  Shield,
  TrendingUp,
  AlertTriangle,
  Target,
  Award,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function CandidateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [candidate, setCandidate] = useState(null)
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Shortlist confirmation dialog
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false)
  const [isShortlisting, setIsShortlisting] = useState(false)
  
  // Interview scheduling dialog
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false)

  // Get params values
  const jobId = params?.jobId
  const applicantId = params?.applicantId

  // Get score color based on value
  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
    if (score >= 60) return "text-green-600 bg-green-500/10 border-green-500/30"
    if (score >= 40) return "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"
    if (score >= 20) return "text-orange-600 bg-orange-500/10 border-orange-500/30"
    return "text-red-600 bg-red-500/10 border-red-500/30"
  }

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-emerald-500"
    if (score >= 60) return "bg-green-500"
    if (score >= 40) return "bg-yellow-500"
    if (score >= 20) return "bg-orange-500"
    return "bg-red-500"
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return "bg-emerald-500 text-white"
    if (confidence >= 90) return "bg-green-500 text-white"
    if (confidence >= 85) return "bg-blue-500 text-white"
    return "bg-gray-500 text-white"
  }

  const getRecommendationBadge = (recommendation) => {
    switch (recommendation) {
      case "STRONG_MATCH":
        return { text: "Strong Match", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: ThumbsUp }
      case "GOOD_MATCH":
        return { text: "Good Match", color: "bg-green-500/10 text-green-700 border-green-500/30", icon: ThumbsUp }
      case "CONSIDER":
        return { text: "Consider", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30", icon: Target }
      case "NOT_RECOMMENDED":
        return { text: "Not Recommended", color: "bg-red-500/10 text-red-700 border-red-500/30", icon: ThumbsDown }
      default:
        return { text: "Pending", color: "bg-gray-500/10 text-gray-700 border-gray-500/30", icon: Clock }
    }
  }

  // Fetch candidate and job data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        if (!jobId || !applicantId) {
          toast({
            title: "Invalid URL",
            description: "Missing job or applicant ID.",
            variant: "destructive",
          })
          router.push("/recruiter/candidates")
          return
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
          description: jobData.description || "",
        })

        // Find the applicant in the job's applicants array
        const applicantsArray = jobData.applicants || []
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

        // Set candidate with all AI screening data from Firestore
        setCandidate({
          ...applicantData,
          jobId: jobId,
        })

        console.log("✅ Candidate loaded:", applicantData.applicantName)

      } catch (error) {
        console.error("Error fetching candidate:", error)
        toast({
          title: "Error",
          description: "Failed to load candidate data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (jobId && applicantId) {
      fetchData()
    }
  }, [jobId, applicantId, router, toast])

  // Send email notification with Reply-To set to recruiter's email
  const sendEmail = async (type, candidateData, jobTitle, companyName, interviewDetails = null) => {
    try {
      // Get recruiter's email from localStorage (set during login)
      const recruiterEmail = localStorage.getItem("userEmail") || localStorage.getItem("email")
      const recruiterName = localStorage.getItem("userName") || localStorage.getItem("name")
      
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
          // Include recruiter's email so replies go to them
          recruiterEmail,
          recruiterName,
        }),
      })
      const data = await response.json()
      if (data.success) {
        console.log("Email sent:", data.message)
        if (data.replyTo) {
          console.log("Reply-To set to:", data.replyTo)
        }
      }
    } catch (error) {
      console.error("Error sending email:", error)
    }
  }

  const updateStatus = async (newStatus, interviewDetails = null) => {
    if (!candidate || !job) return
    
    setIsUpdating(true)
    try {
      const jobDoc = await getDoc(doc(db, "jobs", job.id))
      if (!jobDoc.exists()) return

      const jobData = jobDoc.data()
      const applicants = jobData.applicants || []
      const companyName = jobData.companyName || localStorage.getItem("companyName") || "Company"
      const jobTitle = job.title || "Position"

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
      case "applied": return "bg-blue-500/10 text-blue-700 border-blue-500/20"
      case "reviewed": return "bg-gray-500/10 text-gray-700 border-gray-500/20"
      case "shortlisted": return "bg-green-500/10 text-green-700 border-green-500/20"
      case "interview_scheduled": return "bg-purple-500/10 text-purple-700 border-purple-500/20"
      case "hired": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      case "rejected": return "bg-red-500/10 text-red-700 border-red-500/20"
      default: return "bg-gray-500/10 text-gray-700 border-gray-500/20"
    }
  }

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

  const getStatusIcon = (status) => {
    switch (status) {
      case "applied": return <Clock className="mr-1 h-3 w-3" />
      case "shortlisted": return <Star className="mr-1 h-3 w-3" />
      case "interview_scheduled": return <Calendar className="mr-1 h-3 w-3" />
      case "hired": return <CheckCircle2 className="mr-1 h-3 w-3" />
      case "rejected": return <XCircle className="mr-1 h-3 w-3" />
      default: return <Clock className="mr-1 h-3 w-3" />
    }
  }

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

  const recommendationInfo = getRecommendationBadge(candidate.aiRecommendation)
  const RecommendationIcon = recommendationInfo.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Candidates
        </Button>
      </div>

      {/* AI Screening Results Card - Complete Details */}
      {candidate.aiScore !== undefined && candidate.aiScore !== null && (
        <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">AI Screening Results</CardTitle>
                  <CardDescription>
                    Automated candidate evaluation • Scored on {candidate.aiScoredAt ? formatDate(candidate.aiScoredAt) : "N/A"}
                  </CardDescription>
                </div>
              </div>
              {/* Confidence Badge */}
              {candidate.aiConfidence && (
                <Badge className={`text-sm px-3 py-1 ${getConfidenceColor(candidate.aiConfidence)}`}>
                  <Shield className="h-4 w-4 mr-1.5" />
                  {candidate.aiConfidence}% Confidence
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Score and Recommendation */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Score Circle */}
              <div className="flex items-center gap-6">
                <div className={`flex h-28 w-28 flex-shrink-0 flex-col items-center justify-center rounded-full border-4 ${getScoreColor(candidate.aiScore)}`}>
                  <Zap className="h-6 w-6" />
                  <span className="text-3xl font-bold">{candidate.aiScore}</span>
                  <span className="text-xs opacity-70">/ 100</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Match Score</h3>
                  <Badge variant="outline" className={`${recommendationInfo.color} text-sm px-3 py-1`}>
                    <RecommendationIcon className="h-4 w-4 mr-1.5" />
                    {recommendationInfo.text}
                  </Badge>
                  {candidate.aiDataQuality && (
                    <p className="text-xs text-muted-foreground">
                      Data Quality: {candidate.aiDataQuality}%
                    </p>
                  )}
                </div>
              </div>

              {/* Scoring Breakdown - Skills Focused */}
              {candidate.aiBreakdown && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Score Breakdown <span className="text-blue-500">(Skills-Focused)</span>
                  </h4>
                  
                  {/* Skills Match - 50% (HIGHEST PRIORITY) */}
                  <div className="space-y-1 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Target className="h-4 w-4 text-blue-600" />
                        Skills Match
                        <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-300">HIGHEST</Badge>
                      </span>
                      <span className="font-bold text-blue-700">{candidate.aiBreakdown.skillsMatch?.score || 0}%</span>
                    </div>
                    <Progress value={candidate.aiBreakdown.skillsMatch?.score || 0} className="h-2.5" />
                    <p className="text-xs text-blue-600">Weight: 50% • Contribution: {candidate.aiBreakdown.skillsMatch?.weighted || 0} pts</p>
                    {candidate.aiBreakdown.skillsMatch?.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{candidate.aiBreakdown.skillsMatch.details}</p>
                    )}
                  </div>

                  {/* Experience Relevance - 30% (HIGH PRIORITY) */}
                  <div className="space-y-1 bg-green-50 dark:bg-green-950/20 p-2 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Briefcase className="h-4 w-4 text-green-600" />
                        Experience Relevance
                        <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-300">HIGH</Badge>
                      </span>
                      <span className="font-bold text-green-700">{candidate.aiBreakdown.experienceRelevance?.score || 0}%</span>
                    </div>
                    <Progress value={candidate.aiBreakdown.experienceRelevance?.score || 0} className="h-2.5" />
                    <p className="text-xs text-green-600">Weight: 30% • Contribution: {candidate.aiBreakdown.experienceRelevance?.weighted || 0} pts</p>
                    {candidate.aiBreakdown.experienceRelevance?.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{candidate.aiBreakdown.experienceRelevance.details}</p>
                    )}
                  </div>

                  {/* Practical Exposure - 10% */}
                  <div className="space-y-1 bg-purple-50 dark:bg-purple-950/20 p-2 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-purple-600" />
                        Projects & Practical Work
                      </span>
                      <span className="font-medium text-purple-700">{candidate.aiBreakdown.practicalExposure?.score || 0}%</span>
                    </div>
                    <Progress value={candidate.aiBreakdown.practicalExposure?.score || 0} className="h-2" />
                    <p className="text-xs text-purple-600">Weight: 10% • Contribution: {candidate.aiBreakdown.practicalExposure?.weighted || 0} pts</p>
                    {candidate.aiBreakdown.practicalExposure?.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{candidate.aiBreakdown.practicalExposure.details}</p>
                    )}
                  </div>

                  {/* Education - 10% (LOWEST PRIORITY) */}
                  <div className="space-y-1 p-2 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-500" />
                        Education
                        <Badge variant="outline" className="text-[10px] bg-gray-100 text-gray-600 border-gray-300">LOWEST</Badge>
                      </span>
                      <span className="font-medium text-gray-600">{candidate.aiBreakdown.education?.score || 0}%</span>
                    </div>
                    <Progress value={candidate.aiBreakdown.education?.score || 0} className="h-2" />
                    <p className="text-xs text-gray-500">Weight: 10% • Contribution: {candidate.aiBreakdown.education?.weighted || 0} pts</p>
                    {candidate.aiBreakdown.education?.details && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{candidate.aiBreakdown.education.details}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* AI Explanation */}
            {candidate.aiExplanation && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  AI Analysis Summary
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg">
                  {candidate.aiExplanation}
                </p>
              </div>
            )}

            {/* Detailed Analysis Sections */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Skills Analysis */}
              {candidate.aiSkillsAnalysis && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-700">
                    <Target className="h-4 w-4" />
                    Skills Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    {candidate.aiSkillsAnalysis}
                  </p>
                </div>
              )}

              {/* Experience Analysis */}
              {candidate.aiExperienceAnalysis && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-green-700">
                    <Briefcase className="h-4 w-4" />
                    Experience Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    {candidate.aiExperienceAnalysis}
                  </p>
                </div>
              )}
            </div>

            {/* Education Note */}
            {candidate.aiEducationNote && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2 text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  Education Note <span className="text-xs font-normal">(Lowest Priority Factor)</span>
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  {candidate.aiEducationNote}
                </p>
              </div>
            )}

            {/* Strengths and Concerns */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Strengths */}
              {candidate.aiStrengths && candidate.aiStrengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-4 w-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {candidate.aiStrengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {candidate.aiConcerns && candidate.aiConcerns.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2 text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    Areas of Concern
                  </h4>
                  <ul className="space-y-2">
                    {candidate.aiConcerns.map((concern, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <XCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending AI Screening Notice */}
      {(candidate.aiScore === undefined || candidate.aiScore === null) && (
        <Card className="border-2 border-dashed border-purple-300 bg-purple-50/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                <Brain className="h-6 w-6 text-purple-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Screening Pending</h3>
                <p className="text-sm text-muted-foreground">
                  This candidate will be automatically screened when you visit the candidates list.
                </p>
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
                    {candidate.aiScore !== undefined && candidate.aiScore !== null && (
                      <Badge className={`${getScoreColor(candidate.aiScore)} border`}>
                        <Zap className="mr-1 h-3 w-3" />
                        AI: {candidate.aiScore}%
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
                
                {candidate.aiScoredAt && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                      <Brain className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">AI Screening Completed</p>
                      <p className="text-sm text-muted-foreground">{formatDate(candidate.aiScoredAt)}</p>
                    </div>
                  </div>
                )}
                
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
                  <p className="text-sm text-muted-foreground">{job?.title}</p>
                  {candidate.applicantEmail && (
                    <p className="text-xs text-green-600 mt-1">📧 {candidate.applicantEmail}</p>
                  )}
                </div>
                {candidate.aiScore !== undefined && (
                  <div className={`flex flex-col items-center rounded-lg border px-3 py-1.5 ${getScoreColor(candidate.aiScore)}`}>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span className="text-lg font-bold">{candidate.aiScore}</span>
                    </div>
                    <span className="text-[10px] uppercase">AI Score</span>
                  </div>
                )}
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
