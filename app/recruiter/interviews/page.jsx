"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Building2,
  User,
  Briefcase,
  Mail,
  AlertCircle,
  Star,
} from "lucide-react"
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RecruiterInterviewsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [interviews, setInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState("all")
  const [updatingInterview, setUpdatingInterview] = useState(null)

  // Fetch all interviews from jobs collection
  const fetchInterviews = async () => {
    try {
      setIsLoading(true)
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        setIsLoading(false)
        return
      }

      // Fetch all jobs for this recruiter
      const jobsQuery = query(
        collection(db, "jobs"),
        where("recruiterId", "==", userId)
      )
      
      const jobsSnapshot = await getDocs(jobsQuery)
      const allInterviews = []
      
      jobsSnapshot.docs.forEach((jobDoc) => {
        const jobData = jobDoc.data()
        const jobTitle = jobData.jobtitle || jobData.title || "Untitled Job"
        const applicants = Array.isArray(jobData.applicants) ? jobData.applicants : []
        
        // Filter applicants who have interviews scheduled
        applicants.forEach((applicant) => {
          if (applicant.status === "interview_scheduled" && applicant.interviewDetails) {
            allInterviews.push({
              id: `${jobDoc.id}_${applicant.applicantId}`,
              jobId: jobDoc.id,
              applicantId: applicant.applicantId,
              candidate: applicant.applicantName || "Unknown",
              email: applicant.applicantEmail || "",
              phone: applicant.applicantPhone || "",
              avatar: applicant.applicantAvatar || "",
              position: jobTitle,
              companyName: jobData.companyName || "",
              date: applicant.interviewDetails.date,
              time: applicant.interviewDetails.time,
              type: applicant.interviewDetails.type,
              meetingLink: applicant.interviewDetails.link || "",
              interviewPhone: applicant.interviewDetails.phone || applicant.applicantPhone || "",
              location: applicant.interviewDetails.location || "",
              notes: applicant.interviewDetails.notes || "",
              status: "scheduled",
              appliedAt: applicant.appliedAt,
              scheduledAt: applicant.updatedAt,
            })
          }
          
          // Also get hired candidates as completed interviews
          if (applicant.status === "hired" && applicant.interviewDetails) {
            allInterviews.push({
              id: `${jobDoc.id}_${applicant.applicantId}`,
              jobId: jobDoc.id,
              applicantId: applicant.applicantId,
              candidate: applicant.applicantName || "Unknown",
              email: applicant.applicantEmail || "",
              phone: applicant.applicantPhone || "",
              avatar: applicant.applicantAvatar || "",
              position: jobTitle,
              companyName: jobData.companyName || "",
              date: applicant.interviewDetails.date,
              time: applicant.interviewDetails.time,
              type: applicant.interviewDetails.type,
              meetingLink: applicant.interviewDetails.link || "",
              interviewPhone: applicant.interviewDetails.phone || applicant.applicantPhone || "",
              location: applicant.interviewDetails.location || "",
              notes: applicant.interviewDetails.notes || "",
              status: "completed",
              outcome: "hired",
              appliedAt: applicant.appliedAt,
              scheduledAt: applicant.updatedAt,
            })
          }
          
          // Rejected after interview
          if (applicant.status === "rejected" && applicant.interviewDetails) {
            allInterviews.push({
              id: `${jobDoc.id}_${applicant.applicantId}`,
              jobId: jobDoc.id,
              applicantId: applicant.applicantId,
              candidate: applicant.applicantName || "Unknown",
              email: applicant.applicantEmail || "",
              phone: applicant.applicantPhone || "",
              avatar: applicant.applicantAvatar || "",
              position: jobTitle,
              companyName: jobData.companyName || "",
              date: applicant.interviewDetails.date,
              time: applicant.interviewDetails.time,
              type: applicant.interviewDetails.type,
              meetingLink: applicant.interviewDetails.link || "",
              interviewPhone: applicant.interviewDetails.phone || applicant.applicantPhone || "",
              location: applicant.interviewDetails.location || "",
              notes: applicant.interviewDetails.notes || "",
              status: "completed",
              outcome: "rejected",
              appliedAt: applicant.appliedAt,
              scheduledAt: applicant.updatedAt,
            })
          }
        })
      })
      
      // Sort by date (nearest first for upcoming, newest first for past)
      allInterviews.sort((a, b) => {
        const dateA = new Date(a.date + " " + a.time)
        const dateB = new Date(b.date + " " + b.time)
        return dateA - dateB
      })
      
      setInterviews(allInterviews)
      console.log("✅ Fetched", allInterviews.length, "interviews")
    } catch (error) {
      console.error("❌ Error fetching interviews:", error)
      toast({
        title: "Error loading interviews",
        description: "Failed to load interviews. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Mark interview as completed (hired)
  const markAsCompleted = async (interview, outcome) => {
    setUpdatingInterview(interview.id)
    try {
      const jobRef = doc(db, "jobs", interview.jobId)
      const jobDoc = await getDoc(jobRef)
      
      if (!jobDoc.exists()) return
      
      const jobData = jobDoc.data()
      const applicants = jobData.applicants || []
      const companyName = jobData.companyName || localStorage.getItem("companyName") || "Company"
      const jobTitle = interview.position
      
      const updatedApplicants = applicants.map(app => 
        app.applicantId === interview.applicantId
          ? { ...app, status: outcome, updatedAt: new Date().toISOString() }
          : app
      )
      
      await updateDoc(jobRef, { applicants: updatedApplicants })
      
      // Send email notification
      if (interview.email) {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: outcome,
            to: interview.email,
            candidateName: interview.candidate,
            jobTitle,
            companyName,
          }),
        })
      }
      
      // Update local state
      setInterviews(prev => prev.map(i => 
        i.id === interview.id
          ? { ...i, status: "completed", outcome }
          : i
      ))
      
      toast({
        title: outcome === "hired" ? "🎊 Candidate Hired!" : "Interview Completed",
        description: outcome === "hired" 
          ? `${interview.candidate} has been hired! Congratulations email sent.`
          : `Interview with ${interview.candidate} marked as completed.`,
      })
    } catch (error) {
      console.error("Error updating interview:", error)
      toast({
        title: "Error",
        description: "Failed to update interview status.",
        variant: "destructive",
      })
    } finally {
      setUpdatingInterview(null)
    }
  }

  useEffect(() => {
    fetchInterviews()
  }, [])

  const getTypeIcon = (type) => {
    switch (type) {
      case "google_meet":
      case "zoom":
        return <Video className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "onsite":
        return <Building2 className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case "google_meet":
        return "Google Meet"
      case "zoom":
        return "Zoom"
      case "phone":
        return "Phone"
      case "onsite":
        return "On-site"
      default:
        return type
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case "google_meet":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
      case "zoom":
        return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30"
      case "phone":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
      case "onsite":
        return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getStatusColor = (status, outcome) => {
    if (status === "completed") {
      if (outcome === "hired") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      if (outcome === "rejected") return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
    }
    if (status === "no-show") return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
    if (status === "cancelled") return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30"
    return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
  }

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split("T")[0]
    return dateStr === today
  }

  const isPast = (dateStr) => {
    const today = new Date().toISOString().split("T")[0]
    return dateStr < today
  }

  // Filter interviews
  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = 
      interview.candidate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === "all" || interview.type === filterType
    
    return matchesSearch && matchesType
  })

  const now = new Date().toISOString().split("T")[0]
  const todayInterviews = filteredInterviews.filter(i => isToday(i.date) && i.status === "scheduled")
  const upcomingInterviews = filteredInterviews.filter(i => !isPast(i.date) && i.status === "scheduled")
  const pastInterviews = filteredInterviews.filter(i => isPast(i.date) || i.status === "completed")

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading interviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interview Scheduling</h1>
          <p className="mt-2 text-muted-foreground">Manage and track all your scheduled interviews</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInterviews}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/recruiter/candidates">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule from Candidates
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-foreground">{todayInterviews.length}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-foreground">{upcomingInterviews.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hired</p>
                <p className="text-2xl font-bold text-foreground">
                  {pastInterviews.filter(i => i.outcome === "hired").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-gray-500 bg-gradient-to-r from-gray-500/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">{pastInterviews.length}</p>
              </div>
              <Star className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Interviews Alert */}
      {todayInterviews.length > 0 && (
        <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              Today&apos;s Interviews
            </CardTitle>
            <CardDescription>You have {todayInterviews.length} interview(s) scheduled for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayInterviews.map((interview) => (
                <div key={interview.id} className="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
                  <Avatar className="h-12 w-12 border-2 border-purple-500/30">
                    {interview.avatar ? (
                      <AvatarImage src={interview.avatar} />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {interview.candidate.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{interview.candidate}</h4>
                    <p className="text-sm text-muted-foreground">{interview.position}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {interview.time}
                  </div>
                  <Badge className={getTypeColor(interview.type)} variant="outline">
                    {getTypeIcon(interview.type)}
                    <span className="ml-1">{getTypeLabel(interview.type)}</span>
                  </Badge>
                  {interview.meetingLink && (
                    <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
                        <Video className="mr-2 h-4 w-4" />
                        Join Meeting
                      </Button>
                    </a>
                  )}
                  {interview.type === "phone" && (
                    <a href={`tel:${interview.interviewPhone}`}>
                      <Button size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90">
                        <Phone className="mr-2 h-4 w-4" />
                        Call Now
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate name, position, or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="google_meet">Google Meet</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interviews List */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">Upcoming ({upcomingInterviews.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastInterviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
              <CardDescription>All scheduled interviews with candidates</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingInterviews.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No upcoming interviews</h3>
                  <p className="mt-2 text-muted-foreground">
                    Schedule interviews from the candidates page to see them here.
                  </p>
                  <Link href="/recruiter/candidates">
                    <Button className="mt-4" variant="outline">
                      View Candidates
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingInterviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg border p-4 transition-all hover:shadow-md">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14 border-2 border-primary/20">
                          {interview.avatar ? (
                            <AvatarImage src={interview.avatar} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                              {interview.candidate.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <Link href={`/recruiter/candidates/${interview.jobId}/${interview.applicantId}`}>
                                <h4 className="text-lg font-semibold text-foreground hover:text-primary">
                                  {interview.candidate}
                                </h4>
                              </Link>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {interview.position}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getTypeColor(interview.type)} variant="outline">
                                {getTypeIcon(interview.type)}
                                <span className="ml-1">{getTypeLabel(interview.type)}</span>
                              </Badge>
                              {isToday(interview.date) && (
                                <Badge className="bg-purple-500 text-white">Today</Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(interview.date)}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {interview.time}
                            </div>
                            {interview.meetingLink && (
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-blue-500" />
                                <a
                                  href={interview.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  {interview.meetingLink.substring(0, 40)}...
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                            {interview.type === "phone" && interview.interviewPhone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${interview.interviewPhone}`} className="hover:text-primary">
                                  {interview.interviewPhone}
                                </a>
                              </div>
                            )}
                            {interview.type === "onsite" && interview.location && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {interview.location}
                              </div>
                            )}
                            {interview.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <a href={`mailto:${interview.email}`} className="hover:text-primary">
                                  {interview.email}
                                </a>
                              </div>
                            )}
                          </div>

                          {interview.notes && (
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-sm text-foreground">{interview.notes}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {interview.meetingLink && (
                              <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90">
                                  <Video className="mr-2 h-4 w-4" />
                                  Join Meeting
                                </Button>
                              </a>
                            )}
                            {interview.type === "phone" && (
                              <a href={`tel:${interview.interviewPhone}`}>
                                <Button size="sm" variant="outline">
                                  <Phone className="mr-2 h-4 w-4" />
                                  Call
                                </Button>
                              </a>
                            )}
                            <Link href={`/recruiter/candidates/${interview.jobId}/${interview.applicantId}`}>
                              <Button size="sm" variant="outline">
                                <User className="mr-2 h-4 w-4" />
                                View Profile
                              </Button>
                            </Link>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500"
                              onClick={() => markAsCompleted(interview, "hired")}
                              disabled={updatingInterview === interview.id}
                            >
                              {updatingInterview === interview.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Mark Hired
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:border-red-500"
                              onClick={() => markAsCompleted(interview, "rejected")}
                              disabled={updatingInterview === interview.id}
                            >
                              {updatingInterview === interview.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="mr-2 h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Past Interviews</CardTitle>
              <CardDescription>Completed and concluded interviews</CardDescription>
            </CardHeader>
            <CardContent>
              {pastInterviews.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No past interviews</h3>
                  <p className="mt-2 text-muted-foreground">
                    Completed interviews will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastInterviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg border p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border-2 border-muted">
                          {interview.avatar ? (
                            <AvatarImage src={interview.avatar} />
                          ) : (
                            <AvatarFallback>
                              {interview.candidate.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground">{interview.candidate}</h4>
                              <p className="text-sm text-muted-foreground">{interview.position}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(interview.status, interview.outcome)} variant="outline">
                                {interview.outcome === "hired" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                {interview.outcome === "rejected" && <XCircle className="mr-1 h-3 w-3" />}
                                {interview.outcome === "hired" ? "Hired" : interview.outcome === "rejected" ? "Rejected" : "Completed"}
                              </Badge>
                              <Badge className={getTypeColor(interview.type)} variant="outline">
                                {getTypeIcon(interview.type)}
                                <span className="ml-1">{getTypeLabel(interview.type)}</span>
                              </Badge>
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {formatDate(interview.date)} at {interview.time}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Link href={`/recruiter/candidates/${interview.jobId}/${interview.applicantId}`}>
                              <Button size="sm" variant="outline">
                                View Details
                              </Button>
                            </Link>
                            {interview.email && (
                              <a href={`mailto:${interview.email}`}>
                                <Button size="sm" variant="outline">
                                  <Mail className="mr-2 h-4 w-4" />
                                  Contact
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
