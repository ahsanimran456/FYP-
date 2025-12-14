"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  Search,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Loader2,
  RefreshCw,
  FileText,
} from "lucide-react"
import { collection, getDocs, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ApplicationsPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [showSuccess, setShowSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const printRef = useRef(null)

  // Process jobs snapshot to find user's applications
  const processJobsSnapshot = (snapshot, userId) => {
    const applicationsData = []
    
    snapshot.docs.forEach((jobDoc) => {
      const jobData = jobDoc.data()
      const applicantsArray = jobData.applicants || []
      
      // Find if current user has applied to this job
      const userApplication = applicantsArray.find(
        (applicant) => applicant.applicantId === userId
      )
      
      if (userApplication) {
        applicationsData.push({
          id: `${jobDoc.id}_${userId}`,
          jobId: jobDoc.id,
          title: jobData.jobtitle || jobData.title || "Untitled Job",
          company: jobData.companyName || "Company",
          location: jobData.location || "Not specified",
          salary: jobData.salary || "Competitive",
          appliedDate: userApplication.appliedAt ? new Date(userApplication.appliedAt) : new Date(),
          jobCreatedAt: jobData.createdAt?.toDate?.() || new Date(),
          status: userApplication.status || "applied",
          coverLetter: userApplication.coverLetter,
          department: jobData.department || "General",
          interviewDetails: userApplication.interviewDetails || null,
          applicantData: userApplication,
          // Auto-rejection info
          autoRejected: userApplication.autoRejected || false,
          autoRejectionReason: userApplication.autoRejectionReason || null,
        })
      }
    })
    
    // Sort by most recent
    applicationsData.sort((a, b) => b.appliedDate - a.appliedDate)
    
    return applicationsData
  }

  // Setup real-time listener for applications
  const setupApplicationsListener = () => {
    const userId = localStorage.getItem("userId")
    
    if (!userId) {
      setIsLoading(false)
      return null
    }

    setIsLoading(true)

    // Real-time listener for all jobs (to track status changes)
    const unsubscribe = onSnapshot(collection(db, "jobs"), (snapshot) => {
      const applicationsData = processJobsSnapshot(snapshot, userId)
      
      setApplications(applicationsData)
      setFilteredApplications(applicationsData)
      console.log("✅ Real-time applications update:", applicationsData.length, "applications")
      setIsLoading(false)
    }, (error) => {
      console.error("❌ Error in applications listener:", error)
      toast({
        title: "Error loading applications",
        description: "Failed to load your applications. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    })
    
    return unsubscribe
  }

  // Legacy fetch function for manual refresh
  const fetchApplications = async () => {
    // This will be handled by real-time listener
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 500)
  }

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
    
    const unsubscribe = setupApplicationsListener()
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [searchParams])

  // Filter applications
  useEffect(() => {
    let result = [...applications]
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (app) =>
          app.title.toLowerCase().includes(query) ||
          app.company.toLowerCase().includes(query)
      )
    }
    
    if (filterStatus !== "all") {
      result = result.filter((app) => {
        switch (filterStatus) {
          case "interview":
            return app.status === "interview_scheduled"
          case "shortlisted":
            return app.status === "shortlisted"
          case "applied":
            return app.status === "applied"
          case "rejected":
            return app.status === "rejected"
          case "hired":
            return app.status === "hired"
          default:
            return true
        }
      })
    }
    
    setFilteredApplications(result)
  }, [searchQuery, filterStatus, applications])

  const getStatusIcon = (status) => {
    switch (status) {
      case "interview_scheduled":
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />
      case "shortlisted":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "applied":
        return <AlertCircle className="h-5 w-5 text-gray-600" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "hired":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "interview_scheduled":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "shortlisted":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "applied":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "hired":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      applied: "Applied",
      shortlisted: "Shortlisted",
      interview_scheduled: "Interview Scheduled",
      rejected: "Rejected",
      hired: "Hired",
    }
    return labels[status] || status
  }

  const getNextStep = (status) => {
    switch (status) {
      case "interview_scheduled":
        return "Prepare for your interview"
      case "shortlisted":
        return "You've been shortlisted! Interview may be scheduled soon"
      case "applied":
        return "Application submitted, waiting for review"
      case "rejected":
        return "Position filled or not selected"
      case "hired":
        return "Congratulations! You got the job"
      default:
        return "Application in progress"
    }
  }

  const statusCounts = {
    all: applications.length,
    active: applications.filter((app) => ["interview_scheduled", "shortlisted", "applied"].includes(app.status)).length,
    interviews: applications.filter((app) => app.status === "interview_scheduled").length,
    shortlisted: applications.filter((app) => app.status === "shortlisted").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
    hired: applications.filter((app) => app.status === "hired").length,
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-medium text-green-700 dark:text-green-400">
              Application submitted successfully! You'll hear back from the employer soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Applications</h1>
          <p className="mt-2 text-muted-foreground">Track and manage your job applications</p>
        </div>
        <Button variant="outline" onClick={fetchApplications} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.all}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.active}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviews</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.interviews}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hired</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.hired}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applications..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="interview">Interview Scheduled</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* No Applications */}
      {applications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No applications yet</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Start applying to jobs to track your applications here.
            </p>
            <Link href="/applicant/jobs">
              <Button className="mt-4">Browse Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {applications.length > 0 && (
        <div id="print-applications">
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
              <TabsTrigger value="active">Active ({statusCounts.active})</TabsTrigger>
              <TabsTrigger value="interviews">Interviews ({statusCounts.interviews})</TabsTrigger>
              <TabsTrigger value="hired">Hired ({statusCounts.hired})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({statusCounts.rejected})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredApplications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center p-12">
                    <Search className="h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">No results found</h2>
                    <p className="mt-2 text-center text-muted-foreground">
                      Try adjusting your search or filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredApplications.map((app) => (
                  <Card key={app.id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary font-bold">
                            {app.company?.charAt(0) || "C"}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="flex-1">
                                <Link href={`/applicant/jobs/${app.jobId}`}>
                                  <h3 className="font-semibold text-foreground hover:text-primary">{app.title}</h3>
                                </Link>
                                <p className="text-sm text-muted-foreground">{app.company}</p>
                              </div>
                              <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {app.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-primary">AED</span>
                                {app.salary}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Applied {app.appliedDate.toLocaleDateString()}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-2">
                              {getStatusIcon(app.status)}
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Next:</span> {getNextStep(app.status)}
                              </p>
                            </div>
                            {/* Show rejection reason if rejected */}
                            {app.status === "rejected" && (
                              <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/20 p-3 border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-700 dark:text-red-400">
                                  <span className="font-medium">📋 Reason: </span>
                                  {app.autoRejected 
                                    ? app.autoRejectionReason || "Did not meet the job requirements based on AI screening."
                                    : "Your profile did not match the job requirements at this time."
                                  }
                                </p>
                                {app.autoRejected && (
                                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                    🤖 This decision was made by our AI screening system.
                                  </p>
                                )}
                              </div>
                            )}
                            {/* Interview Details */}
                            {app.status === "interview_scheduled" && app.interviewDetails && (
                              <div className="mt-2 rounded-lg bg-purple-500/10 p-3 border border-purple-500/20">
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                                  📅 Interview: {app.interviewDetails.date} at {app.interviewDetails.time}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Type: {app.interviewDetails.type === "google_meet" ? "📹 Google Meet" : 
                                         app.interviewDetails.type === "zoom" ? "📹 Zoom" :
                                         app.interviewDetails.type === "phone" ? "📞 Phone Call" : "🏢 On-site"}
                                </p>
                                {app.interviewDetails.link && (
                                  <a 
                                    href={app.interviewDetails.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                                  >
                                    🔗 Join Meeting
                                  </a>
                                )}
                                {app.interviewDetails.location && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    📍 {app.interviewDetails.location}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 lg:flex-col">
                          <Link href={`/applicant/jobs/${app.jobId}`} className="flex-1">
                            <Button variant="outline" className="w-full bg-transparent" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View Job
                            </Button>
                          </Link>
                          {app.status === "interview_scheduled" && (
                            <Link href="/applicant/interviews" className="flex-1">
                              <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
                                <Calendar className="mr-2 h-4 w-4" />
                                View Interview
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {applications
                .filter((app) => ["interview_scheduled", "shortlisted", "applied"].includes(app.status))
                .length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <Clock className="h-12 w-12 text-muted-foreground" />
                      <h2 className="mt-4 text-xl font-semibold">No active applications</h2>
                      <p className="mt-2 text-center text-muted-foreground">
                        Apply to jobs to see active applications here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                applications
                  .filter((app) => ["interview_scheduled", "shortlisted", "applied"].includes(app.status))
                  .map((app) => (
                    <Card key={app.id} className="overflow-hidden transition-all hover:shadow-md">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary font-bold">
                              {app.company?.charAt(0) || "C"}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <Link href={`/applicant/jobs/${app.jobId}`}>
                                    <h3 className="font-semibold text-foreground hover:text-primary">{app.title}</h3>
                                  </Link>
                                  <p className="text-sm text-muted-foreground">{app.company}</p>
                                </div>
                                <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(app.status)}
                                <p className="text-sm text-muted-foreground">{getNextStep(app.status)}</p>
                              </div>
                            </div>
                          </div>
                          <Link href={`/applicant/jobs/${app.jobId}`}>
                            <Button variant="outline" size="sm">View Job</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4">
              {applications
                .filter((app) => app.status === "interview_scheduled")
                .length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <Calendar className="h-12 w-12 text-muted-foreground" />
                      <h2 className="mt-4 text-xl font-semibold">No interviews scheduled</h2>
                      <p className="mt-2 text-center text-muted-foreground">
                        When recruiters schedule interviews, they'll appear here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  applications
                    .filter((app) => app.status === "interview_scheduled")
                    .map((app) => (
                      <Card key={app.id} className="overflow-hidden border-purple-500/20 bg-purple-500/5">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-4">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-purple-500/10 text-purple-600 font-bold">
                                {app.company?.charAt(0) || "C"}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-foreground">{app.title}</h3>
                                    <p className="text-sm text-muted-foreground">{app.company}</p>
                                  </div>
                                  <Badge className="bg-purple-500/10 text-purple-700">Interview Scheduled</Badge>
                                </div>
                                {app.interviewDetails && (
                                  <div className="rounded-lg bg-purple-500/10 p-3 border border-purple-500/20">
                                    <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                                      📅 {app.interviewDetails.date} at {app.interviewDetails.time}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {app.interviewDetails.type === "google_meet" ? "📹 Google Meet" : 
                                       app.interviewDetails.type === "zoom" ? "📹 Zoom" :
                                       app.interviewDetails.type === "phone" ? "📞 Phone Call" : "🏢 On-site"}
                                    </p>
                                    {app.interviewDetails.link && (
                                      <a href={app.interviewDetails.link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline mt-1 inline-block">
                                        🔗 Join Meeting
                                      </a>
                                    )}
                                    {app.interviewDetails.location && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        📍 {app.interviewDetails.location}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                                  <p className="text-sm font-medium text-purple-700">Prepare for your interview!</p>
                                </div>
                              </div>
                            </div>
                            <Link href="/applicant/interviews">
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">View Details</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
            </TabsContent>

            <TabsContent value="hired" className="space-y-4">
              {applications
                .filter((app) => app.status === "hired")
                .length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground" />
                      <h2 className="mt-4 text-xl font-semibold">No offers yet</h2>
                      <p className="mt-2 text-center text-muted-foreground">
                        When you get hired, it will appear here. Keep applying!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  applications
                    .filter((app) => app.status === "hired")
                    .map((app) => (
                      <Card key={app.id} className="overflow-hidden border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-4">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600 font-bold">
                                {app.company?.charAt(0) || "C"}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-foreground">{app.title}</h3>
                                    <p className="text-sm text-muted-foreground">{app.company}</p>
                                  </div>
                                  <Badge className="bg-emerald-500/10 text-emerald-700">🎉 Hired!</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                  <p className="text-sm font-medium text-emerald-700">Congratulations on your new role!</p>
                                </div>
                              </div>
                            </div>
                            <Link href={`/applicant/jobs/${app.jobId}`}>
                              <Button variant="outline" size="sm">View Job</Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {applications
                .filter((app) => app.status === "rejected")
                .length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-12">
                      <XCircle className="h-12 w-12 text-muted-foreground" />
                      <h2 className="mt-4 text-xl font-semibold">No rejected applications</h2>
                      <p className="mt-2 text-center text-muted-foreground">
                        Good news! None of your applications have been rejected.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  applications
                    .filter((app) => app.status === "rejected")
                    .map((app) => (
                      <Card key={app.id} className="overflow-hidden border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10">
                        <CardContent className="p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex gap-4">
                              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-red-100 dark:bg-red-900/30 text-red-600 font-bold">
                                {app.company?.charAt(0) || "C"}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <h3 className="font-semibold text-foreground">{app.title}</h3>
                                    <p className="text-sm text-muted-foreground">{app.company}</p>
                                  </div>
                                  <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
                                    {app.autoRejected ? "🤖 Auto-Rejected" : "Rejected"}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {app.location}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Applied {app.appliedDate.toLocaleDateString()}
                                  </span>
                                </div>
                                {/* Rejection Reason */}
                                <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-3 border border-red-200 dark:border-red-800">
                                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                                    📋 Rejection Reason:
                                  </p>
                                  <p className="text-sm text-red-700 dark:text-red-400">
                                    {app.autoRejected 
                                      ? app.autoRejectionReason || "Your profile did not meet the minimum requirements based on AI screening analysis."
                                      : "After careful review, the recruiter decided to proceed with other candidates whose qualifications more closely match their requirements."
                                    }
                                  </p>
                                  {app.autoRejected && (
                                    <p className="text-xs text-red-600 dark:text-red-500 mt-2 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Decision made by AI screening system based on skills and experience match.
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  💡 Tip: Keep improving your profile and skills. Apply for other opportunities that match your experience!
                                </p>
                              </div>
                            </div>
                            <Link href={`/applicant/jobs/${app.jobId}`}>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
                                View Job
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
