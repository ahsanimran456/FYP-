"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import {
  MapPin,
  Clock,
  Users,
  Eye,
  Edit,
  Copy,
  Archive,
  Share2,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Calendar,
  Mail,
  RefreshCw,
} from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function JobDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isStatusChanging, setIsStatusChanging] = useState(false)

  // Get time ago string
  const getTimeAgo = (date) => {
    if (!date) return "Recently"
    
    const now = new Date()
    const diff = now - new Date(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    return `${months} month${months > 1 ? 's' : ''} ago`
  }

  // Fetch job data from Firestore
  const fetchJob = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const jobDoc = await getDoc(doc(db, "jobs", params.id))
      
      if (!jobDoc.exists()) {
        setError("Job not found")
        setIsLoading(false)
        return
      }
      
      const data = jobDoc.data()
      
      setJob({
        id: jobDoc.id,
        title: data.jobtitle || data.title || "Untitled Job",
        location: data.location || "Not specified",
        type: data.type || "Full-time",
        salary: data.salary || "Competitive",
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        status: data.status === "active" ? "Active" : data.status === "closed" ? "Closed" : "Active",
        posted: getTimeAgo(data.createdAt?.toDate?.() || new Date(data.postedDate)),
        postedDate: data.createdAt?.toDate?.() || new Date(data.postedDate),
        applicants: Array.isArray(data.applicants) ? data.applicants.length : 0,
        applicantsData: Array.isArray(data.applicants) ? data.applicants : [],
        newApplicants: 0,
        views: data.views || 0,
        department: data.department || "General",
        experience: data.experience || "Not specified",
        description: data.description || "No description provided.",
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        skills: data.skills || [],
        benefits: data.benefits || "",
        positions: data.positions || 1,
        deadline: data.deadline || null,
        applicationEmail: data.applicationEmail || "",
        companyName: data.companyName || "Company",
        recruiterName: data.recruiterName || "",
        recruiterEmail: data.recruiterEmail || "",
        recruiterId: data.recruiterId,
      })
      
      console.log("✅ Fetched job details:", jobDoc.id)
    } catch (err) {
      console.error("❌ Error fetching job:", err)
      setError(err.message || "Failed to load job details")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (params.id) {
      fetchJob()
    }
  }, [params.id])

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    setIsStatusChanging(true)
    
    try {
      await updateDoc(doc(db, "jobs", params.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      
      setJob(prev => ({
        ...prev,
        status: newStatus === "active" ? "Active" : "Closed"
      }))
      
      toast({
        title: newStatus === "active" ? "Job Reopened" : "Job Closed",
        description: `The job has been ${newStatus === "active" ? "reopened" : "closed"} successfully.`,
      })
    } catch (error) {
      console.error("Error updating job status:", error)
      toast({
        title: "Error",
        description: "Failed to update job status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStatusChanging(false)
    }
  }

  // Handle share
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast({
      title: "Link Copied!",
      description: "Job link has been copied to clipboard.",
    })
  }

  // Handle duplicate
  const handleDuplicate = () => {
    localStorage.setItem("duplicateJob", JSON.stringify(job))
    toast({
      title: "Duplicating Job",
      description: "Redirecting to create a copy...",
    })
    window.location.href = "/recruiter/jobs/new?duplicate=true"
  }

  // Get experience level display
  const getExperienceLabel = (exp) => {
    const labels = {
      entry: "Entry Level (0-2 years)",
      mid: "Mid-Level (2-5 years)",
      senior: "Senior (5-8 years)",
      lead: "Lead (8+ years)",
      executive: "Executive",
    }
    return labels[exp] || exp || "Not specified"
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "Closed":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/recruiter/jobs">
          <Button variant="ghost" size="sm">
            ← Back to Jobs
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">{error}</h2>
            <p className="mt-2 text-center text-muted-foreground">
              The job you're looking for might have been deleted or doesn't exist.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/recruiter/jobs">
                <Button>Back to Jobs</Button>
              </Link>
              <Button variant="outline" onClick={fetchJob}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!job) return null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back Button */}
      <Link href="/recruiter/jobs">
        <Button variant="ghost" size="sm">
          ← Back to Jobs
        </Button>
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
                  <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{job.companyName}</span>
                  <span>•</span>
                  <span className="capitalize">{job.department}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  <span className="capitalize">{job.type}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-primary">AED</span>
                  {job.salary}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Posted {job.posted}
                </span>
              </div>

              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              {job.status === "Active" ? (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange("closed")}
                  disabled={isStatusChanging}
                >
                  {isStatusChanging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <Archive className="mr-2 h-4 w-4" />
                      Close
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => handleStatusChange("active")}
                  disabled={isStatusChanging}
                >
                  {isStatusChanging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reopening...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reopen
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold text-foreground">{job.views}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Applicants</p>
                <p className="text-2xl font-bold text-foreground">{job.applicants}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-2xl font-bold text-foreground">{job.positions}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion</p>
                <p className="text-2xl font-bold text-foreground">
                  {job.views > 0 ? ((job.applicants / job.views) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="description" className="space-y-6">
        <TabsList>
          <TabsTrigger value="description">Job Description</TabsTrigger>
          <TabsTrigger value="applicants">
            <Users className="mr-2 h-4 w-4" />
            Applicants ({job.applicants})
          </TabsTrigger>
          <TabsTrigger value="details">Job Details</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>

          {job.responsibilities && job.responsibilities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.responsibilities.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {job.requirements && job.requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {job.benefits && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-wrap">{job.benefits}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applicants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Applicants</CardTitle>
                <Link href={`/recruiter/candidates?job=${job.id}`}>
                  <Button variant="outline" size="sm">
                    View All Applicants
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {job.applicants === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No applicants yet</h3>
                  <p className="mt-2 text-center text-muted-foreground">
                    When candidates apply for this job, they'll appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This job has {job.applicants} applicant{job.applicants > 1 ? 's' : ''}.
                  </p>
                  <Link href={`/recruiter/candidates?job=${job.id}`}>
                    <Button>
                      <Users className="mr-2 h-4 w-4" />
                      View All {job.applicants} Applicants
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                    <p className="text-foreground">{job.title}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p className="text-foreground capitalize">{job.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Employment Type</p>
                    <p className="text-foreground capitalize">{job.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Experience Level</p>
                    <p className="text-foreground">{getExperienceLabel(job.experience)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-foreground">{job.location}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Salary Range</p>
                    <p className="text-foreground">{job.salary}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
                    <p className="text-foreground">{job.positions}</p>
                  </div>
                  {job.deadline && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Application Deadline</p>
                      <p className="text-foreground">{new Date(job.deadline).toLocaleDateString()}</p>
                    </div>
                  )}
                  {job.applicationEmail && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Application Email</p>
                      <p className="text-foreground">{job.applicationEmail}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company & Recruiter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xl">
                  {job.companyName?.charAt(0) || "C"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{job.companyName}</p>
                  {job.recruiterName && (
                    <p className="text-sm text-muted-foreground">
                      Posted by {job.recruiterName}
                    </p>
                  )}
                  {job.recruiterEmail && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {job.recruiterEmail}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {job.skills && job.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
