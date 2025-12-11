"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { InterviewSchedulingDialog } from "@/components/interview-scheduling-dialog"
import {
  Search,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Brain,
  Calendar,
} from "lucide-react"
import { collection, query, where, getDocs, doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Constants
const ITEMS_PER_PAGE = 10
const SCORE_CACHE_KEY = "ai_candidate_scores"
const MAX_CACHED_SCORES = 50

export default function CandidatesPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJob, setSelectedJob] = useState("all")
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsData, setJobsData] = useState({}) // Full job data for AI scoring
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  
  // AI Scoring states
  const [aiScores, setAiScores] = useState({})
  const [scoringInProgress, setScoringInProgress] = useState({})
  const [isRunningBulkScore, setIsRunningBulkScore] = useState(false)
  const [scoringProgress, setScoringProgress] = useState({ current: 0, total: 0 })
  
  // Shortlist confirmation dialog
  const [shortlistDialogOpen, setShortlistDialogOpen] = useState(false)
  const [candidateToShortlist, setCandidateToShortlist] = useState(null)
  const [isShortlisting, setIsShortlisting] = useState(false)
  
  // Interview scheduling dialog
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false)
  const [candidateToInterview, setCandidateToInterview] = useState(null)
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false)
  
  // Status update loading state (tracks which candidate is being updated)
  const [updatingStatus, setUpdatingStatus] = useState({})
  

  // Load cached scores from localStorage
  const loadCachedScores = useCallback(() => {
    try {
      const cached = localStorage.getItem(SCORE_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setAiScores(parsed)
        return parsed
      }
    } catch (error) {
      console.error("Error loading cached scores:", error)
    }
    return {}
  }, [])

  // Save scores to localStorage (maintains max 50 entries)
  const saveCachedScores = useCallback((scores) => {
    try {
      const entries = Object.entries(scores)
      // Keep only the latest MAX_CACHED_SCORES entries
      if (entries.length > MAX_CACHED_SCORES) {
        const sorted = entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))
        const trimmed = Object.fromEntries(sorted.slice(0, MAX_CACHED_SCORES))
        localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(trimmed))
        return trimmed
      }
      localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(scores))
      return scores
    } catch (error) {
      console.error("Error saving cached scores:", error)
    }
    return scores
  }, [])

  // Parse PDF and get text
  const parsePDF = async (pdfUrl) => {
    try {
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      })
      const data = await response.json()
      return data.success ? data.text : ""
    } catch (error) {
      console.error("PDF Parse Error:", error)
      return ""
    }
  }

  // Score a single candidate with AI
  const scoreCandidate = async (candidate, job) => {
    const cacheKey = `${candidate.jobId}_${candidate.applicantId}`
    
    // Check if already cached
    if (aiScores[cacheKey] && aiScores[cacheKey].score !== undefined) {
      return aiScores[cacheKey]
    }

    setScoringInProgress(prev => ({ ...prev, [cacheKey]: true }))

    try {
      // Parse CV if available
      let cvText = ""
      if (candidate.resumeUrl) {
        cvText = await parsePDF(candidate.resumeUrl)
      }

      // Call scoring API
      const response = await fetch("/api/score-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            applicantId: candidate.applicantId,
            name: candidate.name,
            currentTitle: candidate.currentTitle,
            experience: candidate.experience,
            location: candidate.location,
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
        
        // Update state and cache
        setAiScores(prev => {
          const updated = { ...prev, [cacheKey]: scoreData }
          saveCachedScores(updated)
          return updated
        })

        // Also save to Firestore for persistence
        await saveScoreToFirestore(candidate.jobId, candidate.applicantId, data.score, data.reason)

        return scoreData
      }
    } catch (error) {
      console.error("Scoring Error:", error)
      toast({
        title: "Scoring Failed",
        description: `Failed to score ${candidate.name}`,
        variant: "destructive",
      })
    } finally {
      setScoringInProgress(prev => ({ ...prev, [cacheKey]: false }))
    }

    return null
  }

  // Save score to Firestore for persistence
  const saveScoreToFirestore = async (jobId, applicantId, score, reason) => {
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

  // Run AI scoring for all candidates on current page (or selected job)
  const runBulkScoring = async () => {
    const candidatesToScore = getPaginatedCandidates().filter(c => {
      const cacheKey = `${c.jobId}_${c.applicantId}`
      return !aiScores[cacheKey]?.score && !scoringInProgress[cacheKey]
    })

    if (candidatesToScore.length === 0) {
      toast({
        title: "All Scored",
        description: "All candidates on this page have already been scored.",
      })
      return
    }

    setIsRunningBulkScore(true)
    setScoringProgress({ current: 0, total: candidatesToScore.length })

    for (let i = 0; i < candidatesToScore.length; i++) {
      const candidate = candidatesToScore[i]
      const job = jobsData[candidate.jobId]
      
      if (job) {
        await scoreCandidate(candidate, job)
      }
      
      setScoringProgress({ current: i + 1, total: candidatesToScore.length })
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunningBulkScore(false)
    toast({
      title: "Scoring Complete",
      description: `Scored ${candidatesToScore.length} candidates successfully.`,
    })
  }

  // Process job snapshot data into candidates
  const processJobsSnapshot = (snapshot, cachedScores) => {
    const jobsList = []
    const jobsFullData = {}
    const allCandidates = []
    
    snapshot.docs.forEach((jobDoc) => {
      const jobData = jobDoc.data()
      const jobTitle = jobData.jobtitle || jobData.title || "Untitled Job"
      
      jobsList.push({
        id: jobDoc.id,
        title: jobTitle,
      })
      
      // Store full job data for AI scoring
      jobsFullData[jobDoc.id] = {
        id: jobDoc.id,
        title: jobTitle,
        skills: jobData.skills || [],
        experience: jobData.experience || "",
        location: jobData.location || "",
        requirements: jobData.requirements || [],
        description: jobData.description || "",
      }
      
      // Get applicants from this job
      const applicantsArray = Array.isArray(jobData.applicants) ? jobData.applicants : []
      
      applicantsArray.forEach((applicant) => {
        if (!applicant.applicantId) return
        
        const cacheKey = `${jobDoc.id}_${applicant.applicantId}`
        
        // Check if score exists in Firestore (from previous scoring)
        if (applicant.aiScore !== undefined && !cachedScores[cacheKey]) {
          cachedScores[cacheKey] = {
            score: applicant.aiScore,
            reason: applicant.aiScoreReason || "",
            timestamp: new Date(applicant.aiScoredAt || Date.now()).getTime(),
          }
        }
        
        allCandidates.push({
          id: `${jobDoc.id}_${applicant.applicantId}`,
          applicantId: applicant.applicantId,
          jobId: jobDoc.id,
          jobTitle: jobTitle,
          name: applicant.applicantName || "Unknown",
          email: applicant.applicantEmail || "",
          phone: applicant.applicantPhone || "",
          avatar: applicant.applicantAvatar || "",
          position: jobTitle,
          currentTitle: applicant.currentTitle || "",
          currentCompany: applicant.currentCompany || "",
          experience: applicant.yearsOfExperience || "Not specified",
          location: applicant.applicantLocation || "Not specified",
          education: applicant.education || "Not specified",
          skills: applicant.skills || [],
          status: applicant.status || "applied",
          appliedDate: applicant.appliedAt || new Date().toISOString(),
          coverLetter: applicant.coverLetter || "",
          resumeUrl: applicant.resumeUrl || "",
          resumeName: applicant.resumeName || "",
          linkedIn: applicant.linkedIn || "",
          portfolio: applicant.portfolio || "",
          github: applicant.github || "",
          expectedSalary: applicant.expectedSalary || null,
          availability: applicant.availability || "",
          rating: applicant.rating || 0,
        })
      })
    })
    
    return { jobsList, jobsFullData, allCandidates, cachedScores }
  }

  // Setup real-time listener for candidates
  const setupCandidatesListener = () => {
    const userId = localStorage.getItem("userId")
    
    if (!userId) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    
    // Load cached scores first
    const cachedScores = loadCachedScores()

    // Real-time listener for all jobs
    const jobsQuery = query(
      collection(db, "jobs"),
      where("recruiterId", "==", userId)
    )
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const { jobsList, jobsFullData, allCandidates, cachedScores: updatedScores } = processJobsSnapshot(snapshot, cachedScores)
      
      // Update cached scores with Firestore data
      setAiScores(updatedScores)
      saveCachedScores(updatedScores)
      
      // Sort by applied date (newest first)
      allCandidates.sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
      
      setJobs(jobsList)
      setJobsData(jobsFullData)
      setCandidates(allCandidates)
      
      // Check if there's a job filter from URL
      const jobParam = searchParams.get("job")
      if (jobParam && selectedJob === "all") {
        setSelectedJob(jobParam)
      }
      
      console.log("✅ Real-time candidates update:", allCandidates.length, "candidates from", jobsList.length, "jobs")
      setIsLoading(false)
    }, (error) => {
      console.error("❌ Error in candidates listener:", error)
      toast({
        title: "Error loading candidates",
        description: "Failed to load candidates. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    })
    
    return unsubscribe
  }

  // Legacy fetch function for manual refresh
  const fetchCandidates = async () => {
    // This will be handled by real-time listener
    // Just trigger a re-render by resetting loading
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 500)
  }

  // Update applicant status
  // Send email notification
  const sendEmail = async (type, candidate, jobTitle, companyName, interviewDetails = null) => {
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          to: candidate.email,
          candidateName: candidate.name,
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

  const updateApplicantStatus = async (jobId, applicantId, newStatus, interviewDetails = null) => {
    const updateKey = `${jobId}_${applicantId}`
    setUpdatingStatus(prev => ({ ...prev, [updateKey]: true }))
    
    try {
      const jobRef = doc(db, "jobs", jobId)
      const jobDoc = await getDoc(jobRef)
      
      if (!jobDoc.exists()) return
      
      const jobData = jobDoc.data()
      const applicants = jobData.applicants || []
      const jobTitle = jobData.jobtitle || jobData.title || "Position"
      const companyName = jobData.companyName || localStorage.getItem("companyName") || "Company"
      
      // Find the candidate for email
      const candidateData = applicants.find(app => app.applicantId === applicantId)
      
      const updatedApplicants = applicants.map(app => 
        app.applicantId === applicantId 
          ? { 
              ...app, 
              status: newStatus, 
              updatedAt: new Date().toISOString(),
              ...(interviewDetails && { interviewDetails })
            }
          : app
      )
      
      await updateDoc(jobRef, { applicants: updatedApplicants })
      
      setCandidates(prev => prev.map(c => 
        c.jobId === jobId && c.applicantId === applicantId
          ? { ...c, status: newStatus, interviewDetails }
          : c
      ))
      
      // Send email based on status
      if (candidateData?.applicantEmail) {
        const emailCandidate = {
          name: candidateData.applicantName,
          email: candidateData.applicantEmail,
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
        description: statusMessages[newStatus] || `Status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      })
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [updateKey]: false }))
    }
  }

  // Handle shortlist with confirmation
  const handleShortlistClick = (candidate) => {
    setCandidateToShortlist(candidate)
    setShortlistDialogOpen(true)
  }

  // Handle interview scheduling
  const handleScheduleInterviewClick = (candidate) => {
    setCandidateToInterview(candidate)
    setInterviewDialogOpen(true)
  }

  // Schedule interview
  const handleScheduleInterview = async (interviewDetails) => {
    if (!candidateToInterview) return
    
    setIsSchedulingInterview(true)
    try {
      await updateApplicantStatus(
        candidateToInterview.jobId,
        candidateToInterview.applicantId,
        "interview_scheduled",
        interviewDetails
      )
      setInterviewDialogOpen(false)
      setCandidateToInterview(null)
    } finally {
      setIsSchedulingInterview(false)
    }
  }

  // Confirm shortlist
  const confirmShortlist = async () => {
    if (!candidateToShortlist) return
    
    setIsShortlisting(true)
    try {
      await updateApplicantStatus(
        candidateToShortlist.jobId, 
        candidateToShortlist.applicantId, 
        "shortlisted"
      )
      
      // Show success with email notification message
      toast({
        title: "🎉 Candidate Shortlisted!",
        description: `${candidateToShortlist.name} has been shortlisted. Congratulations email will be sent automatically.`,
      })
    } finally {
      setIsShortlisting(false)
      setShortlistDialogOpen(false)
      setCandidateToShortlist(null)
    }
  }

  useEffect(() => {
    const unsubscribe = setupCandidatesListener()
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [searchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedJob])

  // Helper functions
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
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Unknown"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "applied": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "reviewed": return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
      case "shortlisted": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
      case "interview_scheduled": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      case "rejected": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
      case "hired": return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "applied": return <Clock className="mr-1 h-3 w-3" />
      case "shortlisted": return <Star className="mr-1 h-3 w-3" />
      case "interview_scheduled": return <CheckCircle2 className="mr-1 h-3 w-3" />
      case "rejected": return <XCircle className="mr-1 h-3 w-3" />
      case "hired": return <CheckCircle2 className="mr-1 h-3 w-3" />
      default: return <Clock className="mr-1 h-3 w-3" />
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      applied: "Applied",
      reviewed: "Reviewed",
      shortlisted: "Shortlisted",
      interview_scheduled: "Interview",
      rejected: "Rejected",
      hired: "Hired",
    }
    return labels[status] || status
  }

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
    if (score >= 60) return "text-green-600 bg-green-500/10 border-green-500/30"
    if (score >= 40) return "text-yellow-600 bg-yellow-500/10 border-yellow-500/30"
    if (score >= 20) return "text-orange-600 bg-orange-500/10 border-orange-500/30"
    return "text-red-600 bg-red-500/10 border-red-500/30"
  }

  // Filter and paginate candidates
  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      searchQuery === "" ||
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (candidate.skills && candidate.skills.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase())))

    const matchesJob = selectedJob === "all" || candidate.jobId === selectedJob

    return matchesSearch && matchesJob
  })

  // Sort by AI score if available (highest first)
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const scoreA = aiScores[`${a.jobId}_${a.applicantId}`]?.score ?? -1
    const scoreB = aiScores[`${b.jobId}_${b.applicantId}`]?.score ?? -1
    return scoreB - scoreA
  })

  const totalPages = Math.ceil(sortedCandidates.length / ITEMS_PER_PAGE)
  
  const getPaginatedCandidates = () => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedCandidates.slice(start, start + ITEMS_PER_PAGE)
  }

  const candidatesByStatus = {
    all: filteredCandidates,
    applied: filteredCandidates.filter((c) => c.status === "applied"),
    reviewed: filteredCandidates.filter((c) => c.status === "reviewed"),
    shortlisted: filteredCandidates.filter((c) => c.status === "shortlisted"),
    interview_scheduled: filteredCandidates.filter((c) => c.status === "interview_scheduled"),
    rejected: filteredCandidates.filter((c) => c.status === "rejected"),
    hired: filteredCandidates.filter((c) => c.status === "hired"),
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Candidate Pipeline</h1>
          <p className="mt-2 text-muted-foreground">
            {selectedJob !== "all" 
              ? `Viewing applicants for: ${jobs.find(j => j.id === selectedJob)?.title || "Selected Job"}`
              : "Review and manage all job applicants"
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            disabled={true}
            className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 opacity-50 cursor-not-allowed"
            title="Use individual candidate scoring instead"
          >
            <Brain className="mr-2 h-4 w-4" />
            AI Score All
          </Button>
          <Button variant="outline" onClick={fetchCandidates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Scoring Progress */}
      {isRunningBulkScore && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">AI Scoring in Progress</p>
                <Progress value={(scoringProgress.current / scoringProgress.total) * 100} className="mt-2" />
              </div>
              <span className="text-sm text-muted-foreground">
                {scoringProgress.current} / {scoringProgress.total}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Applied</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.applied.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.reviewed.length}</p>
              </div>
              <Eye className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shortlisted</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.shortlisted.length}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interview</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.interview_scheduled.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hired</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.hired.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-foreground">{candidatesByStatus.rejected.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or skills..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Candidates</CardTitle>
              <CardDescription>
                {sortedCandidates.length} candidate(s) • Sorted by AI Score
              </CardDescription>
            </div>
            {selectedJob === "all" && (
              <p className="text-sm text-muted-foreground">
                💡 Select a specific job to enable AI scoring
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="py-12 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No applicants yet</h3>
              <p className="mt-2 text-muted-foreground">
                When applicants apply for your jobs, they will appear here.
              </p>
              <Link href="/recruiter/jobs">
                <Button className="mt-4" variant="outline">
                  View Your Jobs
                </Button>
              </Link>
            </div>
          ) : getPaginatedCandidates().length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No candidates found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {getPaginatedCandidates().map((candidate) => {
                const cacheKey = `${candidate.jobId}_${candidate.applicantId}`
                const scoreData = aiScores[cacheKey]
                const isScoring = scoringInProgress[cacheKey]
                const job = jobsData[candidate.jobId]

                return (
                  <div
                    key={candidate.id}
                    className="group rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start gap-6">
                      {/* AI Score Badge */}
                      <div className="flex flex-col items-center gap-2">
                        <Avatar className="h-16 w-16 border-2 border-primary/20">
                          {candidate.avatar ? (
                            <AvatarImage src={candidate.avatar} />
                          ) : (
                            <AvatarImage src="/placeholder.svg?height=64&width=64" />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-lg text-white">
                            {candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* AI Score Display */}
                        {scoreData?.score !== undefined ? (
                          <div className={`flex flex-col items-center rounded-lg border px-3 py-1.5 ${getScoreColor(scoreData.score)}`}>
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              <span className="text-lg font-bold">{scoreData.score}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider opacity-70">AI Score</span>
                          </div>
                        ) : isScoring ? (
                          <div className="flex flex-col items-center rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            <span className="text-[10px] text-purple-600">Scoring...</span>
                          </div>
                        ) : selectedJob !== "all" && (
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
                            onClick={() => job && scoreCandidate(candidate, job)}
                            disabled={isScoring}
                          >
                            {isScoring ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Brain className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {isScoring ? "Scoring..." : "AI Score"}
                          </Button>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Link href={`/recruiter/candidates/${candidate.jobId}/${candidate.applicantId}`}>
                                <h3 className="text-xl font-semibold text-foreground hover:text-primary">
                                  {candidate.name}
                                </h3>
                              </Link>
                              <Badge className={getStatusColor(candidate.status)} variant="outline">
                                {getStatusIcon(candidate.status)}
                                {getStatusLabel(candidate.status)}
                              </Badge>
                              {scoreData?.score !== undefined && scoreData.reason && (
                                <span className="text-xs text-muted-foreground italic">
                                  — {scoreData.reason.length > 60 ? scoreData.reason.substring(0, 60) + "..." : scoreData.reason}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-base font-medium text-muted-foreground">
                              Applied for: {candidate.position}
                            </p>
                            {candidate.currentTitle && (
                              <p className="text-sm text-muted-foreground">
                                {candidate.currentTitle} {candidate.currentCompany && `at ${candidate.currentCompany}`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span>{getExperienceLabel(candidate.experience)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{candidate.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                            <span>{getEducationLabel(candidate.education)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Applied {formatDate(candidate.appliedDate)}</span>
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          {candidate.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <a href={`mailto:${candidate.email}`} className="hover:text-primary">
                                {candidate.email}
                              </a>
                            </div>
                          )}
                          {candidate.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${candidate.phone}`} className="hover:text-primary">
                                {candidate.phone}
                              </a>
                            </div>
                          )}
                          {candidate.linkedIn && (
                            <a
                              href={candidate.linkedIn.startsWith("http") ? candidate.linkedIn : `https://${candidate.linkedIn}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              LinkedIn
                            </a>
                          )}
                        </div>

                        {/* Skills */}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.slice(0, 6).map((skill) => (
                              <Badge key={skill} variant="secondary" className="bg-primary/10 text-primary">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 6 && (
                              <Badge variant="secondary" className="bg-muted">
                                +{candidate.skills.length - 6} more
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/recruiter/candidates/${candidate.jobId}/${candidate.applicantId}`}>
                            <Button variant="outline" className="bg-transparent">
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </Button>
                          </Link>
                          
                          {(candidate.status === "applied" || candidate.status === "reviewed") && (
                            <Button 
                              variant="outline"
                              onClick={() => handleShortlistClick(candidate)}
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`]}
                              className="hover:bg-green-50 hover:text-green-600 hover:border-green-500"
                            >
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Star className="mr-2 h-4 w-4" />
                              )}
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? "Shortlisting..." : "Shortlist"}
                            </Button>
                          )}
                          
                          {candidate.status === "shortlisted" && (
                            <Button 
                              onClick={() => handleScheduleInterviewClick(candidate)}
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`]}
                              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:opacity-90"
                            >
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Calendar className="mr-2 h-4 w-4" />
                              )}
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? "Updating..." : "Schedule Interview"}
                            </Button>
                          )}
                          
                          {candidate.status === "interview_scheduled" && (
                            <Button 
                              onClick={() => updateApplicantStatus(candidate.jobId, candidate.applicantId, "hired")}
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`]}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90"
                            >
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? "Hiring..." : "Hire"}
                            </Button>
                          )}
                          
                          {candidate.resumeUrl && (
                            <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline">
                                <FileText className="mr-2 h-4 w-4" />
                                View CV
                              </Button>
                            </a>
                          )}
                          
                          {candidate.email && (
                            <a href={`mailto:${candidate.email}`}>
                              <Button variant="outline">
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </Button>
                            </a>
                          )}
                          
                          {candidate.status !== "rejected" && candidate.status !== "hired" && (
                            <Button 
                              variant="outline" 
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 bg-transparent"
                              onClick={() => updateApplicantStatus(candidate.jobId, candidate.applicantId, "rejected")}
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`]}
                            >
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="mr-2 h-4 w-4" />
                              )}
                              {updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] ? "Rejecting..." : "Reject"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedCandidates.length)} of {sortedCandidates.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
          
          {candidateToShortlist && (
            <div className="py-4">
              <div className="flex items-center gap-4 rounded-lg border bg-green-50 dark:bg-green-950/20 p-4">
                <Avatar className="h-14 w-14 border-2 border-green-500/30">
                  {candidateToShortlist.avatar ? (
                    <AvatarImage src={candidateToShortlist.avatar} />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                      {candidateToShortlist.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{candidateToShortlist.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {candidateToShortlist.position}
                  </p>
                  {candidateToShortlist.email && (
                    <p className="text-xs text-green-600 mt-1">
                      📧 {candidateToShortlist.email}
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
        candidate={candidateToInterview ? {
          name: candidateToInterview.name,
          email: candidateToInterview.email,
          phone: candidateToInterview.phone,
          avatar: candidateToInterview.avatar,
        } : null}
        jobTitle={candidateToInterview?.position || ""}
        onSchedule={handleScheduleInterview}
        isScheduling={isSchedulingInterview}
      />
    </div>
  )
}
