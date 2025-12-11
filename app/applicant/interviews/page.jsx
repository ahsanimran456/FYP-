"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Building2, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Phone,
  ExternalLink,
  AlertCircle,
} from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function InterviewsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [upcomingInterviews, setUpcomingInterviews] = useState([])
  const [pastInterviews, setPastInterviews] = useState([])

  // Fetch interviews from jobs collection
  const fetchInterviews = async () => {
    try {
      setIsLoading(true)
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        setIsLoading(false)
        return
      }

      const jobsSnapshot = await getDocs(collection(db, "jobs"))
      const interviews = []
      const now = new Date()
      
      jobsSnapshot.docs.forEach((jobDoc) => {
        const jobData = jobDoc.data()
        const applicantsArray = jobData.applicants || []
        
        // Find user's application with interview scheduled
        const userApplication = applicantsArray.find(
          (applicant) => applicant.applicantId === userId && applicant.status === "interview_scheduled"
        )
        
        if (userApplication && userApplication.interviewDetails) {
          const details = userApplication.interviewDetails
          const interviewDateTime = new Date(`${details.date}T${details.time}`)
          
          interviews.push({
            id: `${jobDoc.id}_${userId}`,
            jobId: jobDoc.id,
            company: jobData.companyName || "Company",
            position: jobData.jobtitle || jobData.title || "Position",
            date: details.date,
            time: details.time,
            type: details.type || "video",
            link: details.link || "",
            phone: details.phone || "",
            location: details.location || "",
            notes: details.notes || "",
            status: "Confirmed",
            interviewDateTime,
            isPast: interviewDateTime < now,
          })
        }
        
        // Also check for hired candidates (past interviews)
        const hiredApplication = applicantsArray.find(
          (applicant) => applicant.applicantId === userId && applicant.status === "hired"
        )
        
        if (hiredApplication && hiredApplication.interviewDetails) {
          const details = hiredApplication.interviewDetails
          interviews.push({
            id: `${jobDoc.id}_${userId}_hired`,
            jobId: jobDoc.id,
            company: jobData.companyName || "Company",
            position: jobData.jobtitle || jobData.title || "Position",
            date: details.date,
            time: details.time,
            type: details.type || "video",
            status: "Hired",
            isPast: true,
            result: "Hired! 🎉",
          })
        }
      })
      
      // Sort by date
      interviews.sort((a, b) => new Date(b.interviewDateTime) - new Date(a.interviewDateTime))
      
      // Separate upcoming and past
      setUpcomingInterviews(interviews.filter(i => !i.isPast))
      setPastInterviews(interviews.filter(i => i.isPast))
      
      console.log("✅ Fetched interviews:", interviews.length)
    } catch (error) {
      console.error("❌ Error fetching interviews:", error)
      toast({
        title: "Error loading interviews",
        description: "Failed to load your interviews. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInterviews()
  }, [])

  // Get interview type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case "google_meet":
      case "zoom":
        return <Video className="h-5 w-5 text-muted-foreground" />
      case "phone":
        return <Phone className="h-5 w-5 text-muted-foreground" />
      case "onsite":
        return <Building2 className="h-5 w-5 text-muted-foreground" />
      default:
        return <Video className="h-5 w-5 text-muted-foreground" />
    }
  }

  // Get interview type label
  const getTypeLabel = (type) => {
    const labels = {
      google_meet: "Google Meet",
      zoom: "Zoom Meeting",
      phone: "Phone Call",
      onsite: "On-site Interview",
    }
    return labels[type] || "Video Call"
  }

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Check if interview is today
  const isToday = (dateStr) => {
    const today = new Date()
    const interviewDate = new Date(dateStr)
    return today.toDateString() === interviewDate.toDateString()
  }

  // Check if interview is tomorrow
  const isTomorrow = (dateStr) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const interviewDate = new Date(dateStr)
    return tomorrow.toDateString() === interviewDate.toDateString()
  }

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
          <h1 className="text-3xl font-bold text-foreground">Interview Schedule</h1>
          <p className="mt-2 text-muted-foreground">Manage your upcoming and past interviews</p>
        </div>
        <Button variant="outline" onClick={fetchInterviews} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{upcomingInterviews.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {upcomingInterviews.filter(i => isToday(i.date)).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{pastInterviews.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Interviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Interviews</h2>
        
        {upcomingInterviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <Calendar className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No upcoming interviews</h3>
              <p className="mt-2 text-center text-muted-foreground">
                When recruiters schedule interviews with you, they'll appear here.
              </p>
              <Link href="/applicant/jobs">
                <Button className="mt-4" variant="outline">Browse Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          upcomingInterviews.map((interview) => (
            <Card key={interview.id} className={`overflow-hidden ${isToday(interview.date) ? 'border-orange-500 bg-orange-500/5' : isTomorrow(interview.date) ? 'border-purple-500/50 bg-purple-500/5' : ''}`}>
              <CardHeader className="bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-background">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{interview.position}</CardTitle>
                      <p className="text-sm text-muted-foreground">{interview.company}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {interview.status}
                    </Badge>
                    {isToday(interview.date) && (
                      <Badge className="bg-orange-500 text-white">
                        🔥 Today!
                      </Badge>
                    )}
                    {isTomorrow(interview.date) && (
                      <Badge variant="outline" className="border-purple-500 text-purple-600">
                        Tomorrow
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Interview Details Grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground">{formatDate(interview.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium text-foreground">{interview.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      {getTypeIcon(interview.type)}
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium text-foreground">{getTypeLabel(interview.type)}</p>
                      </div>
                    </div>
                    {(interview.type === "google_meet" || interview.type === "zoom") && interview.link && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <ExternalLink className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">Meeting Link</p>
                          <a 
                            href={interview.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline truncate block"
                          >
                            Join Meeting
                          </a>
                        </div>
                      </div>
                    )}
                    {interview.type === "onsite" && interview.location && (
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium text-foreground">{interview.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {interview.notes && (
                    <>
                      <Separator />
                      <div className="rounded-lg border-l-4 border-primary bg-muted/30 p-4">
                        <div className="flex items-start gap-2">
                          <FileText className="mt-0.5 h-4 w-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Interview Notes</p>
                            <p className="mt-1 text-sm text-muted-foreground">{interview.notes}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Preparation Tips */}
                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">💡 Preparation Tips</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Research the company and role thoroughly</li>
                      <li>• Prepare questions to ask the interviewer</li>
                      <li>• Test your {interview.type === "phone" ? "phone" : "video/audio"} setup in advance</li>
                      <li>• Have your resume and portfolio ready</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {(interview.type === "google_meet" || interview.type === "zoom") && interview.link && (
                      <a href={interview.link} target="_blank" rel="noopener noreferrer">
                        <Button>
                          <Video className="mr-2 h-4 w-4" />
                          Join Meeting
                        </Button>
                      </a>
                    )}
                    <Link href={`/applicant/jobs/${interview.jobId}`}>
                      <Button variant="outline">View Job Details</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Past Interviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Past Interviews</h2>
        
        {pastInterviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No past interviews yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pastInterviews.map((interview) => (
              <Card key={interview.id} className={interview.result === "Hired! 🎉" ? "border-green-500/30 bg-green-500/5" : ""}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{interview.position}</h3>
                        <p className="text-sm text-muted-foreground">{interview.company}</p>
                      </div>
                      <Badge variant="outline">{getTypeLabel(interview.type)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(interview.date)}
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Result:</p>
                      <Badge
                        className={
                          interview.result === "Hired! 🎉"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                        }
                      >
                        {interview.result || "Completed"}
                      </Badge>
                    </div>
                    <Link href={`/applicant/jobs/${interview.jobId}`}>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        View Job
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
