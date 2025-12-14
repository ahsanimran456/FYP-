"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Shield,
  ThumbsUp,
  ThumbsDown,
  Filter,
} from "lucide-react"
import { collection, query, where, getDocs, doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Constants
const ITEMS_PER_PAGE = 10

export default function CandidatesPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedJob, setSelectedJob] = useState("all")
  const [aiFilter, setAiFilter] = useState("all") // all, recommended, not_recommended, rejected
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [jobsData, setJobsData] = useState({}) // Full job data for AI scoring
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  
  // AI Scoring states - Firestore is the only source of truth
  const [scoringInProgress, setScoringInProgress] = useState({})
  const [autoScoringStatus, setAutoScoringStatus] = useState({ running: false, current: 0, total: 0 })
  
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
  
  // Ref to prevent duplicate auto-scoring runs
  const autoScoringRef = useRef(false)

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

  // Score a single candidate with AI and save to Firestore
  const scoreCandidate = async (candidate, job) => {
    const cacheKey = `${candidate.jobId}_${candidate.applicantId}`
    
    // Skip if already has score in Firestore (check from candidate data)
    if (candidate.aiScore !== undefined && candidate.aiScore !== null) {
      console.log(`⏭️ Skipping ${candidate.name} - already scored (${candidate.aiScore})`)
      return { score: candidate.aiScore, confidence: candidate.aiConfidence || 85 }
    }

    setScoringInProgress(prev => ({ ...prev, [cacheKey]: true }))

    try {
      // Parse CV if available
      let cvText = ""
      if (candidate.resumeUrl) {
        cvText = await parsePDF(candidate.resumeUrl)
      }

      // Call scoring API with comprehensive data
      const response = await fetch("/api/score-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            applicantId: candidate.applicantId,
            name: candidate.name,
            currentTitle: candidate.currentTitle,
            currentCompany: candidate.currentCompany,
            experience: candidate.experience,
            location: candidate.location,
            skills: candidate.skills,
            education: candidate.education,
            expectedSalary: candidate.expectedSalary,
            availability: candidate.availability,
            linkedIn: candidate.linkedIn,
            portfolio: candidate.portfolio,
            github: candidate.github,
            coverLetter: candidate.coverLetter,
          },
          job: {
            title: job.title,
            company: job.company,
            department: job.department,
            skills: job.skills,
            experience: job.experience,
            location: job.location,
            type: job.type,
            salary: job.salary,
            requirements: job.requirements,
            description: job.description,
          },
          cvText,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Save to Firestore immediately with all screening data
        await saveScoreToFirestore(
          candidate.jobId, 
          candidate.applicantId, 
          data.score, 
          data.confidence,
          data.explanation,
          data.breakdown,
          data.strengths,
          data.concerns,
          data.recommendation,
          data.dataQuality,
          data.skillsAnalysis,
          data.experienceAnalysis,
          data.educationNote
        )

        // Update local state with AI screening results
        // Note: Auto-rejection happens in a separate batch process after all screening is complete
        setCandidates(prev => prev.map(c => 
          c.jobId === candidate.jobId && c.applicantId === candidate.applicantId
            ? { 
                ...c, 
                aiScore: data.score,
                aiConfidence: data.confidence,
                aiExplanation: data.explanation,
                aiBreakdown: data.breakdown,
                aiStrengths: data.strengths,
                aiConcerns: data.concerns,
                aiRecommendation: data.recommendation,
                aiDataQuality: data.dataQuality,
                aiSkillsAnalysis: data.skillsAnalysis,
                aiExperienceAnalysis: data.experienceAnalysis,
                aiEducationNote: data.educationNote,
              }
            : c
        ))

        console.log(`✅ Scored ${candidate.name}: ${data.score} (Skills-focused, confidence: ${data.confidence}%)`)
        return data
      }
    } catch (error) {
      console.error("Scoring Error:", error)
    } finally {
      setScoringInProgress(prev => ({ ...prev, [cacheKey]: false }))
    }

    return null
  }

  // Auto-reject candidate based on AI screening (confidence > 80% AND score < 50%)
  const autoRejectCandidate = async (jobId, applicantId, score, confidence, candidateName, candidateEmail) => {
    try {
      const jobRef = doc(db, "jobs", jobId)
      const jobDoc = await getDoc(jobRef)
      
      if (!jobDoc.exists()) return
      
      const jobData = jobDoc.data()
      const applicants = jobData.applicants || []
      const jobTitle = jobData.jobtitle || jobData.title || "Position"
      const companyName = jobData.companyName || localStorage.getItem("companyName") || "Company"
      
      const updatedApplicants = applicants.map(app => 
        app.applicantId === applicantId 
          ? { 
              ...app, 
              status: "rejected",
              autoRejected: true,
              autoRejectedAt: new Date().toISOString(),
              autoRejectionReason: `AI Screening: Score ${score}% with ${confidence}% confidence (below threshold)`,
              updatedAt: new Date().toISOString(),
            }
          : app
      )
      
      await updateDoc(jobRef, { applicants: updatedApplicants })
      console.log(`🚫 Auto-rejected in Firestore: ${applicantId} (Score: ${score}%, Confidence: ${confidence}%)`)
      
      // Send rejection email automatically
      if (candidateEmail) {
        try {
          await sendEmail("rejected", { name: candidateName, email: candidateEmail }, jobTitle, companyName)
          console.log(`📧 Rejection email sent to ${candidateEmail}`)
        } catch (emailError) {
          console.error("Failed to send rejection email:", emailError)
        }
      }
    } catch (error) {
      console.error("Error auto-rejecting candidate:", error)
    }
  }

  // Save score to Firestore with complete AI screening data (Skills-Focused)
  const saveScoreToFirestore = async (jobId, applicantId, score, confidence, explanation, breakdown, strengths, concerns, recommendation, dataQuality, skillsAnalysis, experienceAnalysis, educationNote) => {
    try {
      const jobRef = doc(db, "jobs", jobId)
      const jobDoc = await getDoc(jobRef)
      
      if (jobDoc.exists()) {
        const jobData = jobDoc.data()
        const applicants = jobData.applicants || []
        
        const updatedApplicants = applicants.map(app => 
          app.applicantId === applicantId 
            ? { 
                ...app, 
                // AI Screening Results
                aiScore: score, 
                aiConfidence: confidence,
                aiExplanation: explanation,
                aiBreakdown: breakdown,
                aiStrengths: strengths,
                aiConcerns: concerns,
                aiRecommendation: recommendation,
                aiDataQuality: dataQuality,
                aiSkillsAnalysis: skillsAnalysis,
                aiExperienceAnalysis: experienceAnalysis,
                aiEducationNote: educationNote,
                aiScoredAt: new Date().toISOString(),
                // Skills-focused scoring weights
                aiScoringWeights: {
                  skillsMatch: 50,
                  experienceRelevance: 30,
                  practicalExposure: 10,
                  education: 10,
                },
              }
            : app
        )
        
        await updateDoc(jobRef, { applicants: updatedApplicants })
        console.log(`💾 Saved AI screening to Firestore: ${applicantId} (Score: ${score}, Confidence: ${confidence}%)`)
      }
    } catch (error) {
      console.error("Error saving score to Firestore:", error)
    }
  }

  // Check and auto-reject older candidates that meet the criteria
  const checkAndAutoRejectOlderCandidates = useCallback(async (candidatesList) => {
    // Find candidates that should be auto-rejected but weren't
    const candidatesToAutoReject = candidatesList.filter(c => 
      c.aiScore !== undefined && 
      c.aiScore !== null &&
      c.aiConfidence > 80 && 
      c.aiScore < 50 && 
      c.status !== "rejected" && 
      c.status !== "hired" &&
      !c.autoRejected
    )

    if (candidatesToAutoReject.length === 0) {
      return
    }

    console.log(`🔍 Found ${candidatesToAutoReject.length} older candidate(s) to auto-reject...`)

    // Add a short delay before starting auto-rejection for smoother UX
    await new Promise(resolve => setTimeout(resolve, 1500))

    for (const candidate of candidatesToAutoReject) {
      console.log(`🚫 Auto-rejecting older candidate ${candidate.name}: Score ${candidate.aiScore}% with ${candidate.aiConfidence}% confidence`)
      await autoRejectCandidate(
        candidate.jobId, 
        candidate.applicantId, 
        candidate.aiScore, 
        candidate.aiConfidence,
        candidate.name,
        candidate.email
      )
      
      // Update local state
      setCandidates(prev => prev.map(c => 
        c.jobId === candidate.jobId && c.applicantId === candidate.applicantId
          ? { ...c, status: "rejected", autoRejected: true }
          : c
      ))
      
      // Delay between rejections for smooth processing
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Single toast at the end for all auto-rejections (smooth, not jerky)
    toast({
      title: "🤖 Auto-Rejection Complete",
      description: `${candidatesToAutoReject.length} candidate(s) auto-rejected. Rejection emails sent.`,
      variant: "destructive",
    })
  }, [])

  // Automatic AI screening for unscored candidates
  const runAutoScoring = useCallback(async (candidatesList, jobsFullData) => {
    // Prevent duplicate runs
    if (autoScoringRef.current) {
      console.log("⏳ Auto-scoring already in progress, skipping...")
      return
    }

    // Filter candidates that need scoring (no aiScore in Firestore)
    const unscoredCandidates = candidatesList.filter(c => 
      c.aiScore === undefined || c.aiScore === null
    )

    // If no unscored candidates, just check for auto-rejections of already-scored ones
    if (unscoredCandidates.length === 0) {
      console.log("✅ All candidates already scored, checking for pending auto-rejections...")
      await checkAndAutoRejectOlderCandidates(candidatesList)
      return
    }

    if (unscoredCandidates.length === 0) {
      console.log("✅ All candidates already scored")
      return
    }

    autoScoringRef.current = true
    setAutoScoringStatus({ running: true, current: 0, total: unscoredCandidates.length })

    console.log(`🤖 Starting auto-scoring for ${unscoredCandidates.length} candidates...`)

    for (let i = 0; i < unscoredCandidates.length; i++) {
      const candidate = unscoredCandidates[i]
      const job = jobsFullData[candidate.jobId]
      
      if (job) {
        await scoreCandidate(candidate, job)
      }
      
      setAutoScoringStatus(prev => ({ ...prev, current: i + 1 }))
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    autoScoringRef.current = false
    setAutoScoringStatus({ running: false, current: 0, total: 0 })
    
    // Show screening complete toast
    toast({
      title: "🎯 AI Screening Complete",
      description: `Successfully screened ${unscoredCandidates.length} candidate(s). Checking for auto-rejections...`,
      duration: 4000,
    })

    // Wait for toast to settle and state to update before checking for auto-rejections
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Fetch fresh candidates from Firestore for auto-rejection check
    const userId = localStorage.getItem("userId")
    if (userId) {
      const jobsQuery = query(
        collection(db, "jobs"),
        where("recruiterId", "==", userId)
      )
      const snapshot = await getDocs(jobsQuery)
      const { allCandidates } = processJobsSnapshot(snapshot)
      
      // Run auto-rejection for any candidates that meet criteria
      await checkAndAutoRejectOlderCandidates(allCandidates)
    }
  }, [])

  // Process job snapshot data into candidates
  const processJobsSnapshot = (snapshot) => {
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
        company: jobData.companyName || "",
        department: jobData.department || "",
        skills: jobData.skills || [],
        experience: jobData.experience || "",
        location: jobData.location || "",
        type: jobData.type || "",
        salary: jobData.salary || "",
        requirements: jobData.requirements || [],
        description: jobData.description || "",
      }
      
      // Get applicants from this job
      const applicantsArray = Array.isArray(jobData.applicants) ? jobData.applicants : []
      
      applicantsArray.forEach((applicant) => {
        if (!applicant.applicantId) return
        
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
          // AI Score data from Firestore (source of truth) - Skills Focused
          aiScore: applicant.aiScore,
          aiConfidence: applicant.aiConfidence,
          aiExplanation: applicant.aiExplanation,
          aiBreakdown: applicant.aiBreakdown,
          aiStrengths: applicant.aiStrengths,
          aiConcerns: applicant.aiConcerns,
          aiRecommendation: applicant.aiRecommendation,
          aiDataQuality: applicant.aiDataQuality,
          aiSkillsAnalysis: applicant.aiSkillsAnalysis,
          aiExperienceAnalysis: applicant.aiExperienceAnalysis,
          aiEducationNote: applicant.aiEducationNote,
          aiScoredAt: applicant.aiScoredAt,
          // Auto-rejection data
          autoRejected: applicant.autoRejected || false,
          autoRejectedAt: applicant.autoRejectedAt,
          autoRejectionReason: applicant.autoRejectionReason,
        })
      })
    })
    
    return { jobsList, jobsFullData, allCandidates }
  }

  // Setup real-time listener for candidates
  const setupCandidatesListener = () => {
    const userId = localStorage.getItem("userId")
    
    if (!userId) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)

    // Real-time listener for all jobs
    const jobsQuery = query(
      collection(db, "jobs"),
      where("recruiterId", "==", userId)
    )
    
    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const { jobsList, jobsFullData, allCandidates } = processJobsSnapshot(snapshot)
      
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

      // Automatically run AI screening for unscored candidates
      runAutoScoring(allCandidates, jobsFullData)
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

  // Manual refresh
  const fetchCandidates = async () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 500)
  }

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
      autoScoringRef.current = false
    }
  }, [searchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedJob, aiFilter])

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

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
    if (confidence >= 90) return "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg shadow-green-500/30"
    if (confidence >= 85) return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
    return "bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-md"
  }

  const getConfidenceBgColor = (confidence) => {
    if (confidence >= 95) return "from-emerald-50 to-green-50 border-emerald-200 dark:from-emerald-950/30 dark:to-green-950/30 dark:border-emerald-800"
    if (confidence >= 90) return "from-green-50 to-teal-50 border-green-200 dark:from-green-950/30 dark:to-teal-950/30 dark:border-green-800"
    if (confidence >= 85) return "from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800"
    return "from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/30 dark:to-slate-950/30 dark:border-gray-800"
  }

  const getRecommendationBadge = (recommendation) => {
    switch (recommendation) {
      case "STRONG_MATCH":
        return { text: "Strong Match", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" }
      case "GOOD_MATCH":
        return { text: "Good Match", color: "bg-green-500/10 text-green-700 border-green-500/30" }
      case "CONSIDER":
        return { text: "Consider", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" }
      case "NOT_RECOMMENDED":
        return { text: "Not Recommended", color: "bg-red-500/10 text-red-700 border-red-500/30" }
      default:
        return { text: "Pending", color: "bg-gray-500/10 text-gray-700 border-gray-500/30" }
    }
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

    // AI Recommendation filter
    let matchesAiFilter = true
    if (aiFilter === "recommended") {
      // Recommended: STRONG_MATCH or GOOD_MATCH, or score >= 60
      matchesAiFilter = 
        candidate.aiRecommendation === "STRONG_MATCH" || 
        candidate.aiRecommendation === "GOOD_MATCH" ||
        (candidate.aiScore !== undefined && candidate.aiScore >= 60)
    } else if (aiFilter === "not_recommended") {
      // Not Recommended: CONSIDER or NOT_RECOMMENDED, or score < 60
      matchesAiFilter = 
        candidate.aiRecommendation === "CONSIDER" || 
        candidate.aiRecommendation === "NOT_RECOMMENDED" ||
        (candidate.aiScore !== undefined && candidate.aiScore < 60 && candidate.status !== "rejected")
    } else if (aiFilter === "rejected") {
      // Rejected candidates
      matchesAiFilter = candidate.status === "rejected"
    } else if (aiFilter === "auto_rejected") {
      // Auto-rejected by AI
      matchesAiFilter = candidate.autoRejected === true
    }

    return matchesSearch && matchesJob && matchesAiFilter
  })

  // Sort by AI score if available (highest first), then by applied date (most recent first)
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    // First sort by AI score (highest first)
    const scoreA = a.aiScore ?? -1
    const scoreB = b.aiScore ?? -1
    if (scoreB !== scoreA) return scoreB - scoreA
    
    // Then by applied date (most recent first)
    const dateA = new Date(a.appliedDate || 0)
    const dateB = new Date(b.appliedDate || 0)
    return dateB - dateA
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

  // AI Recommendation counts (from all candidates, not filtered)
  const aiRecommendationCounts = {
    recommended: candidates.filter(c => 
      c.aiRecommendation === "STRONG_MATCH" || 
      c.aiRecommendation === "GOOD_MATCH" ||
      (c.aiScore !== undefined && c.aiScore >= 60 && c.status !== "rejected")
    ).length,
    notRecommended: candidates.filter(c => 
      (c.aiRecommendation === "CONSIDER" || c.aiRecommendation === "NOT_RECOMMENDED" ||
      (c.aiScore !== undefined && c.aiScore < 60)) && c.status !== "rejected"
    ).length,
    rejected: candidates.filter(c => c.status === "rejected").length,
    autoRejected: candidates.filter(c => c.autoRejected === true).length,
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
          <Button variant="outline" onClick={fetchCandidates} disabled={autoScoringStatus.running}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI Screening Progress */}
      {autoScoringStatus.running && (
        <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                <Brain className="h-3 w-3 text-pink-500 absolute -bottom-1 -right-1" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">🤖 Automatic AI Screening in Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Analyzing candidate profiles, CVs, and job requirements...
                </p>
                <Progress value={(autoScoringStatus.current / autoScoringStatus.total) * 100} className="mt-2" />
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Please wait — all actions are disabled during screening to prevent unnecessary API calls.
                </p>
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                {autoScoringStatus.current} / {autoScoringStatus.total}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendation Quick Filters */}
      <div className={`flex flex-wrap gap-3 ${autoScoringStatus.running ? "opacity-60 pointer-events-none" : ""}`}>
        <button
          onClick={() => setAiFilter("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            aiFilter === "all" 
              ? "bg-primary text-primary-foreground shadow-md" 
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
          disabled={autoScoringStatus.running}
        >
          <span>📋</span>
          All Candidates
          <Badge variant="secondary" className="ml-1 bg-white/20">{candidates.length}</Badge>
        </button>
        <button
          onClick={() => setAiFilter("recommended")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            aiFilter === "recommended" 
              ? "bg-green-600 text-white shadow-md" 
              : "bg-green-100 hover:bg-green-200 text-green-700"
          }`}
          disabled={autoScoringStatus.running}
        >
          <ThumbsUp className="h-4 w-4" />
          Recommended
          <Badge variant="secondary" className={aiFilter === "recommended" ? "bg-white/20 text-white" : "bg-green-200 text-green-800"}>
            {aiRecommendationCounts.recommended}
          </Badge>
        </button>
        <button
          onClick={() => setAiFilter("not_recommended")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            aiFilter === "not_recommended" 
              ? "bg-orange-600 text-white shadow-md" 
              : "bg-orange-100 hover:bg-orange-200 text-orange-700"
          }`}
          disabled={autoScoringStatus.running}
        >
          <ThumbsDown className="h-4 w-4" />
          Not Recommended
          <Badge variant="secondary" className={aiFilter === "not_recommended" ? "bg-white/20 text-white" : "bg-orange-200 text-orange-800"}>
            {aiRecommendationCounts.notRecommended}
          </Badge>
        </button>
        <button
          onClick={() => setAiFilter("rejected")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            aiFilter === "rejected" 
              ? "bg-red-600 text-white shadow-md" 
              : "bg-red-100 hover:bg-red-200 text-red-700"
          }`}
          disabled={autoScoringStatus.running}
        >
          <XCircle className="h-4 w-4" />
          Rejected
          <Badge variant="secondary" className={aiFilter === "rejected" ? "bg-white/20 text-white" : "bg-red-200 text-red-800"}>
            {aiRecommendationCounts.rejected}
          </Badge>
        </button>
        <button
          onClick={() => setAiFilter("auto_rejected")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            aiFilter === "auto_rejected" 
              ? "bg-purple-600 text-white shadow-md" 
              : "bg-purple-100 hover:bg-purple-200 text-purple-700"
          }`}
          disabled={autoScoringStatus.running}
        >
          <Brain className="h-4 w-4" />
          Auto-Rejected by AI
          <Badge variant="secondary" className={aiFilter === "auto_rejected" ? "bg-white/20 text-white" : "bg-purple-200 text-purple-800"}>
            {aiRecommendationCounts.autoRejected}
          </Badge>
        </button>
      </div>

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
      <Card className={autoScoringStatus.running ? "opacity-60 pointer-events-none" : ""}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or skills..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={autoScoringStatus.running}
                />
              </div>
              <Select value={selectedJob} onValueChange={setSelectedJob} disabled={autoScoringStatus.running}>
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
              <Select value={aiFilter} onValueChange={setAiFilter} disabled={autoScoringStatus.running}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="AI Recommendation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <span>📋</span> All Candidates
                    </span>
                  </SelectItem>
                  <SelectItem value="recommended">
                    <span className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" /> Recommended
                    </span>
                  </SelectItem>
                  <SelectItem value="not_recommended">
                    <span className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-orange-600" /> Not Recommended
                    </span>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" /> Rejected
                    </span>
                  </SelectItem>
                  <SelectItem value="auto_rejected">
                    <span className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-red-600" /> Auto-Rejected by AI
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Display */}
            {(selectedJob !== "all" || aiFilter !== "all" || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1 pl-3 pr-1">
                    Search: "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery("")}
                      className="ml-1 rounded-sm hover:bg-muted"
                      disabled={autoScoringStatus.running}
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedJob !== "all" && (
                  <Badge variant="secondary" className="gap-1 pl-3 pr-1">
                    Job: {jobs.find(j => j.id === selectedJob)?.title || "Selected"}
                    <button
                      onClick={() => setSelectedJob("all")}
                      className="ml-1 rounded-sm hover:bg-muted"
                      disabled={autoScoringStatus.running}
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {aiFilter !== "all" && (
                  <Badge 
                    variant="secondary" 
                    className={`gap-1 pl-3 pr-1 ${
                      aiFilter === "recommended" ? "bg-green-100 text-green-700" :
                      aiFilter === "not_recommended" ? "bg-orange-100 text-orange-700" :
                      aiFilter === "rejected" || aiFilter === "auto_rejected" ? "bg-red-100 text-red-700" : ""
                    }`}
                  >
                    {aiFilter === "recommended" && "✓ Recommended"}
                    {aiFilter === "not_recommended" && "⚠ Not Recommended"}
                    {aiFilter === "rejected" && "✗ Rejected"}
                    {aiFilter === "auto_rejected" && "🤖 Auto-Rejected"}
                    <button
                      onClick={() => setAiFilter("all")}
                      className="ml-1 rounded-sm hover:bg-muted"
                      disabled={autoScoringStatus.running}
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedJob("all")
                    setAiFilter("all")
                  }}
                  disabled={autoScoringStatus.running}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Candidates List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {aiFilter === "all" && "All Candidates"}
                {aiFilter === "recommended" && "✓ Recommended Candidates"}
                {aiFilter === "not_recommended" && "⚠ Not Recommended Candidates"}
                {aiFilter === "rejected" && "✗ Rejected Candidates"}
                {aiFilter === "auto_rejected" && "🤖 Auto-Rejected by AI"}
              </CardTitle>
              <CardDescription>
                {sortedCandidates.length} candidate(s) 
                {aiFilter === "recommended" && " • AI Score ≥ 60% or Strong/Good Match"}
                {aiFilter === "not_recommended" && " • AI Score < 60% or Consider/Not Recommended"}
                {aiFilter === "rejected" && " • Rejected by recruiter or AI"}
                {aiFilter === "auto_rejected" && " • Automatically rejected based on AI screening criteria"}
                {aiFilter === "all" && " • Sorted by AI Score • Auto-screened"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-purple-500" />
              <span>AI Screening Active</span>
            </div>
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
                <Button className="mt-4" variant="outline" disabled={autoScoringStatus.running}>
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
                const isScoring = scoringInProgress[cacheKey]

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
                        {candidate.aiScore !== undefined && candidate.aiScore !== null ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className={`flex flex-col items-center rounded-xl border-2 px-4 py-2 ${getScoreColor(candidate.aiScore)}`}>
                              <div className="flex items-center gap-1.5">
                                <Zap className="h-4 w-4" />
                                <span className="text-2xl font-bold">{candidate.aiScore}</span>
                              </div>
                              <span className="text-[10px] uppercase tracking-wider opacity-70 font-medium">AI Score</span>
                            </div>
                            {/* Confidence Badge (85-100%) - Bigger & Better */}
                            {candidate.aiConfidence !== undefined && (
                              <div className={`flex flex-col items-center rounded-lg border bg-gradient-to-br px-3 py-2 ${getConfidenceBgColor(candidate.aiConfidence)}`}>
                                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${getConfidenceColor(candidate.aiConfidence)}`}>
                                  <Shield className="h-3.5 w-3.5" />
                                  <span className="text-sm font-bold">{candidate.aiConfidence}%</span>
                                </div>
                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                                  AI Confidence
                                </span>
                              </div>
                            )}
                            {/* Recommendation Badge */}
                            {candidate.aiRecommendation && (
                              <Badge variant="outline" className={`text-[10px] px-2 py-1 font-medium ${getRecommendationBadge(candidate.aiRecommendation).color}`}>
                                {getRecommendationBadge(candidate.aiRecommendation).text}
                              </Badge>
                            )}
                          </div>
                        ) : isScoring ? (
                          <div className="flex flex-col items-center rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2">
                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                            <span className="text-[10px] text-purple-600 mt-1">AI Screening</span>
                            <span className="text-[9px] text-purple-500">in progress...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center rounded-lg border border-gray-300/50 bg-gray-100/50 px-3 py-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-[10px] text-gray-500 mt-1">Queued</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Link href={`/recruiter/candidates/${candidate.jobId}/${candidate.applicantId}`} className={autoScoringStatus.running ? "pointer-events-none" : ""}>
                                <h3 className={`text-xl font-semibold text-foreground hover:text-primary ${autoScoringStatus.running ? "opacity-60" : ""}`}>
                                  {candidate.name}
                                </h3>
                              </Link>
                              <Badge className={getStatusColor(candidate.status)} variant="outline">
                                {getStatusIcon(candidate.status)}
                                {getStatusLabel(candidate.status)}
                              </Badge>
                              {/* Auto-Rejected Badge */}
                              {candidate.autoRejected && (
                                <Badge className="bg-red-600 text-white border-red-700 text-[10px] px-2 py-0.5">
                                  <Brain className="h-3 w-3 mr-1" />
                                  Auto-Rejected by AI
                                </Badge>
                              )}
                            </div>
                            {/* AI Screening Summary */}
                            {candidate.aiExplanation && (
                              <div className="mt-1.5 space-y-1">
                                <p className="text-xs text-muted-foreground italic line-clamp-2">
                                  💡 {candidate.aiExplanation.length > 100 ? candidate.aiExplanation.substring(0, 100) + "..." : candidate.aiExplanation}
                                </p>
                                {/* Breakdown Scores - Skills Focused */}
                                {candidate.aiBreakdown && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-[10px] text-muted-foreground bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded font-medium">
                                      Skills: {candidate.aiBreakdown.skillsMatch?.score || 0}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                                      Experience: {candidate.aiBreakdown.experienceRelevance?.score || 0}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
                                      Projects: {candidate.aiBreakdown.practicalExposure?.score || 0}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      Edu: {candidate.aiBreakdown.education?.score || 0}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
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
                        <div className={`flex flex-wrap gap-2 ${autoScoringStatus.running ? "opacity-50" : ""}`}>
                          <Link href={`/recruiter/candidates/${candidate.jobId}/${candidate.applicantId}`} className={autoScoringStatus.running ? "pointer-events-none" : ""}>
                            <Button variant="outline" className="bg-transparent" disabled={autoScoringStatus.running}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Profile
                            </Button>
                          </Link>
                          
                          {(candidate.status === "applied" || candidate.status === "reviewed") && (
                            <Button 
                              variant="outline"
                              onClick={() => handleShortlistClick(candidate)}
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] || autoScoringStatus.running}
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
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] || autoScoringStatus.running}
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
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] || autoScoringStatus.running}
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
                            <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className={autoScoringStatus.running ? "pointer-events-none" : ""}>
                              <Button variant="outline" disabled={autoScoringStatus.running}>
                                <FileText className="mr-2 h-4 w-4" />
                                View CV
                              </Button>
                            </a>
                          )}
                          
                          {candidate.email && (
                            <a href={`mailto:${candidate.email}`} className={autoScoringStatus.running ? "pointer-events-none" : ""}>
                              <Button variant="outline" disabled={autoScoringStatus.running}>
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
                              disabled={updatingStatus[`${candidate.jobId}_${candidate.applicantId}`] || autoScoringStatus.running}
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
            <div className={`mt-6 flex items-center justify-between border-t pt-4 ${autoScoringStatus.running ? "opacity-50" : ""}`}>
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedCandidates.length)} of {sortedCandidates.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || autoScoringStatus.running}
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
                        disabled={autoScoringStatus.running}
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
                  disabled={currentPage === totalPages || autoScoringStatus.running}
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
      <AlertDialog open={shortlistDialogOpen && !autoScoringStatus.running} onOpenChange={(open) => !autoScoringStatus.running && setShortlistDialogOpen(open)}>
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
                {/* Show AI Score and Confidence in dialog */}
                {candidateToShortlist.aiScore !== undefined && (
                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex flex-col items-center rounded-xl border-2 px-4 py-2 ${getScoreColor(candidateToShortlist.aiScore)}`}>
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-4 w-4" />
                        <span className="text-2xl font-bold">{candidateToShortlist.aiScore}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider opacity-70 font-medium">AI Score</span>
                    </div>
                    {candidateToShortlist.aiConfidence && (
                      <div className={`flex flex-col items-center rounded-lg border bg-gradient-to-br px-3 py-1.5 ${getConfidenceBgColor(candidateToShortlist.aiConfidence)}`}>
                        <div className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 ${getConfidenceColor(candidateToShortlist.aiConfidence)}`}>
                          <Shield className="h-3 w-3" />
                          <span className="text-xs font-bold">{candidateToShortlist.aiConfidence}%</span>
                        </div>
                        <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                          Confidence
                        </span>
                      </div>
                    )}
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
            <AlertDialogCancel disabled={isShortlisting || autoScoringStatus.running}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmShortlist}
              disabled={isShortlisting || autoScoringStatus.running}
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
        open={interviewDialogOpen && !autoScoringStatus.running}
        onOpenChange={(open) => !autoScoringStatus.running && setInterviewDialogOpen(open)}
        candidate={candidateToInterview ? {
          name: candidateToInterview.name,
          email: candidateToInterview.email,
          phone: candidateToInterview.phone,
          avatar: candidateToInterview.avatar,
        } : null}
        jobTitle={candidateToInterview?.position || ""}
        onSchedule={handleScheduleInterview}
        isScheduling={isSchedulingInterview || autoScoringStatus.running}
      />
    </div>
  )
}
