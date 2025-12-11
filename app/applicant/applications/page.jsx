"use client"

import { useState, useEffect } from "react"
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
  TrendingUp,
  Eye,
  Loader2,
  RefreshCw,
  FileText,
  Trash2,
} from "lucide-react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
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

  // Fetch applications from jobs collection (applicants array inside each job)
  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      const userId = localStorage.getItem("userId")
      
      if (!userId) {
        setIsLoading(false)
        return
      }

      // Fetch all jobs and find where user has applied
      const jobsSnapshot = await getDocs(collection(db, "jobs"))
      const applicationsData = []
      
      jobsSnapshot.docs.forEach((jobDoc) => {
        const jobData = jobDoc.data()
        const applicantsArray = jobData.applicants || []
        
        // Find if current user has applied to this job
        const userApplication = applicantsArray.find(
          (applicant) => applicant.applicantId === userId
        )
        
        if (userApplication) {
          applicationsData.push({
            id: `${jobDoc.id}_${userId}`, // Unique ID for the application
            jobId: jobDoc.id,
            title: jobData.jobtitle || jobData.title || "Untitled Job",
            company: jobData.companyName || "Company",
            location: jobData.location || "Not specified",
            salary: jobData.salary || "Competitive",
            appliedDate: userApplication.appliedAt ? new Date(userApplication.appliedAt) : new Date(),
            status: userApplication.status || "applied",
            coverLetter: userApplication.coverLetter,
            department: jobData.department || "General",
            // Store reference to update later
            applicantData: userApplication,
          })
        }
      })
      
      // Sort by most recent
      applicationsData.sort((a, b) => b.appliedDate - a.appliedDate)
      
      setApplications(applicationsData)
      setFilteredApplications(applicationsData)
      console.log("✅ Fetched", applicationsData.length, "applications")
    } catch (error) {
      console.error("❌ Error fetching applications:", error)
      toast({
        title: "Error loading applications",
        description: "Failed to load your applications. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    }
    fetchApplications()
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
          case "review":
            return app.status === "reviewed" || app.status === "under_review"
          case "applied":
            return app.status === "applied"
          case "rejected":
            return app.status === "rejected"
          default:
            return true
        }
      })
    }
    
    setFilteredApplications(result)
  }, [searchQuery, filterStatus, applications])

  // Withdraw application (remove from job's applicants array)
  const handleWithdraw = async (applicationId, jobId) => {
    try {
      const userId = localStorage.getItem("userId")
      
      // Get current job data
      const jobRef = doc(db, "jobs", jobId)
      const jobsSnapshot = await getDocs(collection(db, "jobs"))
      const jobDoc = jobsSnapshot.docs.find(d => d.id === jobId)
      
      if (jobDoc) {
        const jobData = jobDoc.data()
        const currentApplicants = jobData.applicants || []
        
        // Filter out the current user's application
        const updatedApplicants = currentApplicants.filter(
          (applicant) => applicant.applicantId !== userId
        )
        
        // Update the job document
        await updateDoc(jobRef, {
          applicants: updatedApplicants,
        })
        
        setApplications(applications.filter((app) => app.id !== applicationId))
        toast({
          title: "Application withdrawn",
          description: "Your application has been withdrawn successfully.",
        })
      }
    } catch (error) {
      console.error("Error withdrawing application:", error)
      toast({
        title: "Error",
        description: "Failed to withdraw application.",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "interview_scheduled":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "reviewed":
      case "under_review":
        return <Clock className="h-5 w-5 text-blue-600" />
      case "applied":
        return <AlertCircle className="h-5 w-5 text-gray-600" />
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "hired":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "interview_scheduled":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "reviewed":
      case "under_review":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "applied":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "hired":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      applied: "Applied",
      under_review: "Under Review",
      reviewed: "Reviewed",
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
      case "reviewed":
      case "under_review":
        return "Waiting for recruiter decision"
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
    active: applications.filter((app) => ["interview_scheduled", "reviewed", "under_review", "applied"].includes(app.status)).length,
    interviews: applications.filter((app) => app.status === "interview_scheduled").length,
    rejected: applications.filter((app) => app.status === "rejected").length,
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
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="mt-1 text-3xl font-bold text-foreground">
                  {statusCounts.all > 0 ? Math.round(((statusCounts.all - statusCounts.active + statusCounts.interviews) / statusCounts.all) * 100) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
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
                <SelectItem value="interview">Interview Scheduled</SelectItem>
                <SelectItem value="review">Under Review</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
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
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
            <TabsTrigger value="active">Active ({statusCounts.active})</TabsTrigger>
            <TabsTrigger value="interviews">Interviews ({statusCounts.interviews})</TabsTrigger>
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
                        </div>
                      </div>
                      <div className="flex gap-2 lg:flex-col">
                        <Link href={`/applicant/jobs/${app.jobId}`} className="flex-1">
                          <Button variant="outline" className="w-full bg-transparent" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Job
                          </Button>
                        </Link>
                        {app.status === "applied" && (
                          <Button 
                            variant="ghost" 
                            className="flex-1 text-destructive hover:text-destructive" 
                            size="sm"
                            onClick={() => handleWithdraw(app.id, app.jobId)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Withdraw
                          </Button>
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
              .filter((app) => ["interview_scheduled", "reviewed", "under_review", "applied"].includes(app.status))
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
              ))}
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
                    <Card key={app.id} className="overflow-hidden border-green-500/20 bg-green-500/5">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-green-500/10 text-green-600 font-bold">
                              {app.company?.charAt(0) || "C"}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{app.title}</h3>
                                  <p className="text-sm text-muted-foreground">{app.company}</p>
                                </div>
                                <Badge className="bg-green-500/10 text-green-700">Interview Scheduled</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <p className="text-sm font-medium text-green-700">Prepare for your interview!</p>
                              </div>
                            </div>
                          </div>
                          <Link href={`/applicant/jobs/${app.jobId}`}>
                            <Button size="sm">View Details</Button>
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
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <h2 className="mt-4 text-xl font-semibold">No rejections</h2>
                    <p className="mt-2 text-center text-muted-foreground">
                      Great news! None of your applications have been rejected.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                applications
                  .filter((app) => app.status === "rejected")
                  .map((app) => (
                    <Card key={app.id} className="overflow-hidden opacity-75">
                      <CardContent className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground font-bold">
                              {app.company?.charAt(0) || "C"}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{app.title}</h3>
                                  <p className="text-sm text-muted-foreground">{app.company}</p>
                                </div>
                                <Badge variant="destructive">Rejected</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Applied {app.appliedDate.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Link href="/applicant/jobs">
                            <Button variant="outline" size="sm">Find Similar Jobs</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
