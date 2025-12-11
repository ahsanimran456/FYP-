"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Briefcase, Users, Eye, TrendingUp, Clock, CheckCircle2, Calendar, ArrowUpRight, Plus, Loader2 } from "lucide-react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RecruiterDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState([])
  const [recentApplicants, setRecentApplicants] = useState([])
  const [upcomingInterviews, setUpcomingInterviews] = useState([])
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplicants: 0,
    totalViews: 0,
    hired: 0,
  })
  const [hiringFunnel, setHiringFunnel] = useState([])

  // Get time ago string
  const getTimeAgo = (date) => {
    if (!date) return "Recently"
    const now = new Date()
    const diff = now - new Date(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} min ago`
    if (hours < 24) return `${hours} hours ago`
    if (days < 7) return `${days} days ago`
    return `${Math.floor(days / 7)} weeks ago`
  }

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
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
        
        let totalApplicants = 0
        let totalViews = 0
        let hiredCount = 0
        let appliedCount = 0
        let reviewedCount = 0
        let shortlistedCount = 0
        let interviewCount = 0
        const allApplicants = []
        const allInterviews = []
        const jobsList = []
        
        const now = new Date()
        
        jobsSnapshot.docs.forEach((doc) => {
          const jobData = doc.data()
          const jobTitle = jobData.jobtitle || jobData.title || "Untitled Job"
          const applicantsArray = Array.isArray(jobData.applicants) ? jobData.applicants : []
          
          // Check if job is active
          const expiryDate = jobData.expiryDate ? new Date(jobData.expiryDate) : null
          const isExpired = expiryDate && now > expiryDate
          const isActive = jobData.status === "active" && !isExpired
          
          if (isActive) {
            // Calculate new applicants (applied in last 7 days)
            const newApplicants = applicantsArray.filter(app => {
              const appliedDate = new Date(app.appliedAt || Date.now())
              const daysSince = (now - appliedDate) / (1000 * 60 * 60 * 24)
              return daysSince <= 7
            }).length
            
            jobsList.push({
              id: doc.id,
              title: jobTitle,
              location: jobData.location || "Not specified",
              type: jobData.type || "Full-time",
              posted: getTimeAgo(jobData.createdAt?.toDate?.() || new Date(jobData.postedDate)),
              applicants: applicantsArray.length,
              newApplicants: newApplicants,
              views: jobData.views || 0,
              status: "Active",
            })
          }
          
          totalApplicants += applicantsArray.length
          totalViews += jobData.views || 0
          
          // Process each applicant
          applicantsArray.forEach((applicant) => {
            const status = applicant.status || "applied"
            
            // Count by status for funnel
            if (status === "applied") appliedCount++
            if (status === "reviewed") reviewedCount++
            if (status === "shortlisted") shortlistedCount++
            if (status === "interview_scheduled") interviewCount++
            if (status === "hired") hiredCount++
            
            // Add to recent applicants list
            allApplicants.push({
              id: `${doc.id}_${applicant.applicantId}`,
              jobId: doc.id,
              applicantId: applicant.applicantId,
              name: applicant.applicantName || "Unknown",
              position: jobTitle,
              appliedDate: getTimeAgo(applicant.appliedAt),
              experience: applicant.yearsOfExperience || "Not specified",
              matchScore: applicant.aiScore || 0,
              status: status,
              avatar: applicant.applicantAvatar || "",
              appliedAt: applicant.appliedAt || new Date().toISOString(),
            })
            
            // Check for upcoming interviews
            if (status === "interview_scheduled" && applicant.interviewDetails) {
              const interviewDate = new Date(applicant.interviewDetails.date)
              if (interviewDate >= now) {
                allInterviews.push({
                  id: `${doc.id}_${applicant.applicantId}`,
                  jobId: doc.id,
                  applicantId: applicant.applicantId,
                  candidate: applicant.applicantName || "Unknown",
                  position: jobTitle,
                  date: interviewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                  time: applicant.interviewDetails.time || "TBD",
                  type: applicant.interviewDetails.type || "Interview",
                  rawDate: interviewDate,
                })
              }
            }
          })
        })
        
        // Sort jobs by applicants (most first), limit to 3
        jobsList.sort((a, b) => b.applicants - a.applicants)
        setActiveJobs(jobsList.slice(0, 3))
        
        // Sort applicants by applied date (newest first), limit to 4
        allApplicants.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
        setRecentApplicants(allApplicants.slice(0, 4))
        
        // Sort interviews by date (soonest first), limit to 3
        allInterviews.sort((a, b) => a.rawDate - b.rawDate)
        setUpcomingInterviews(allInterviews.slice(0, 3))
        
        // Set stats
        setStats({
          activeJobs: jobsList.length,
          totalApplicants: totalApplicants,
          totalViews: totalViews,
          hired: hiredCount,
        })
        
        // Calculate hiring funnel
        const totalApplications = totalApplicants || 1 // Avoid division by zero
        setHiringFunnel([
          { stage: "Applications", count: totalApplicants, percentage: 100 },
          { stage: "Reviewed", count: reviewedCount + shortlistedCount + interviewCount + hiredCount, percentage: Math.round(((reviewedCount + shortlistedCount + interviewCount + hiredCount) / totalApplications) * 100) },
          { stage: "Shortlisted", count: shortlistedCount + interviewCount + hiredCount, percentage: Math.round(((shortlistedCount + interviewCount + hiredCount) / totalApplications) * 100) },
          { stage: "Interviews", count: interviewCount + hiredCount, percentage: Math.round(((interviewCount + hiredCount) / totalApplications) * 100) },
          { stage: "Hired", count: hiredCount, percentage: Math.round((hiredCount / totalApplications) * 100) },
        ])
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

  const getStatusColor = (status) => {
    switch (status) {
      case "applied":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "reviewed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      case "shortlisted":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "interview_scheduled":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "hired":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      applied: "New",
      reviewed: "Reviewed",
      shortlisted: "Shortlisted",
      interview_scheduled: "Interview",
      hired: "Hired",
      rejected: "Rejected",
    }
    return labels[status] || status
  }

  const getExperienceLabel = (exp) => {
    const labels = {
      "0-1": "< 1 year",
      "1-2": "1-2 years",
      "3-5": "3-5 years",
      "5-7": "5-7 years",
      "7-10": "7-10 years",
      "10+": "10+ years",
    }
    return labels[exp] || exp || "N/A"
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statsData = [
    { icon: Briefcase, label: "Active Jobs", value: stats.activeJobs.toString(), change: "Current", trend: "up", color: "text-blue-600" },
    { icon: Users, label: "Total Applicants", value: stats.totalApplicants.toString(), change: "All time", trend: "up", color: "text-green-600" },
    { icon: Eye, label: "Profile Views", value: stats.totalViews.toLocaleString(), change: "All jobs", trend: "up", color: "text-accent" },
    { icon: CheckCircle2, label: "Hired", value: stats.hired.toString(), change: "Total", trend: "up", color: "text-chart-4" },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Welcome back! Here&apos;s an overview of your hiring activities.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/recruiter/jobs/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <ArrowUpRight className="h-3 w-3 text-green-600" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg bg-muted", stat.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Jobs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Job Postings</CardTitle>
                <CardDescription>Manage your current job listings</CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/recruiter/jobs/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Job
                  </Button>
                </Link>
                <Link href="/recruiter/jobs">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeJobs.length === 0 ? (
                <div className="py-8 text-center">
                  <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No active jobs yet</p>
                  <Link href="/recruiter/jobs/new" className="mt-3 inline-block">
                    <Button size="sm">Post Your First Job</Button>
                  </Link>
                </div>
              ) : (
                activeJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/recruiter/jobs/${job.id}`}>
                              <h4 className="font-semibold text-foreground hover:text-primary">{job.title}</h4>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {job.location} • {job.type}
                            </p>
                          </div>
                          <Badge variant="secondary">{job.status}</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Applicants</p>
                            <p className="font-medium text-foreground">
                              {job.applicants}
                              {job.newApplicants > 0 && (
                                <span className="ml-1 text-xs text-blue-600">(+{job.newApplicants} new)</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Views</p>
                            <p className="font-medium text-foreground">{job.views}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Posted</p>
                            <p className="font-medium text-foreground">{job.posted}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Interviews</CardTitle>
            <CardDescription>Your scheduled interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingInterviews.length === 0 ? (
                <div className="py-6 text-center">
                  <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No upcoming interviews</p>
                </div>
              ) : (
                upcomingInterviews.map((interview) => (
                  <div key={interview.id} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg?height=32&width=32" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                          {interview.candidate
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-foreground">{interview.candidate}</h4>
                        <p className="text-xs text-muted-foreground">{interview.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {interview.date} at {interview.time}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {interview.type === "google_meet" ? "Google Meet" : 
                       interview.type === "zoom" ? "Zoom" :
                       interview.type === "phone" ? "Phone Call" :
                       interview.type === "onsite" ? "On-site" : interview.type}
                    </Badge>
                  </div>
                ))
              )}
              <Link href="/recruiter/interviews">
                <Button variant="outline" className="w-full bg-transparent" size="sm">
                  View All Interviews
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applicants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Applicants</CardTitle>
              <CardDescription>Latest candidates who applied to your jobs</CardDescription>
            </div>
            <Link href="/recruiter/candidates">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplicants.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No applicants yet</p>
                <p className="text-sm text-muted-foreground">Post a job to start receiving applications</p>
              </div>
            ) : (
              recentApplicants.map((applicant) => (
                <div key={applicant.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <Avatar className="h-12 w-12">
                    {applicant.avatar ? (
                      <AvatarImage src={applicant.avatar} />
                    ) : (
                      <AvatarImage src="/placeholder.svg?height=48&width=48" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {applicant.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/recruiter/candidates/${applicant.jobId}/${applicant.applicantId}`}>
                          <h4 className="font-semibold text-foreground hover:text-primary">{applicant.name}</h4>
                        </Link>
                        <p className="text-sm text-muted-foreground">Applied for {applicant.position}</p>
                      </div>
                      <Badge className={getStatusColor(applicant.status)}>{getStatusLabel(applicant.status)}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{getExperienceLabel(applicant.experience)}</span>
                      {applicant.matchScore > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {applicant.matchScore}% AI
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {applicant.appliedDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/recruiter/candidates/${applicant.jobId}/${applicant.applicantId}`}>
                      <Button size="sm" variant="outline">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hiring Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Funnel Analytics</CardTitle>
          <CardDescription>Track candidates through your hiring process</CardDescription>
        </CardHeader>
        <CardContent>
          {hiringFunnel.length === 0 || stats.totalApplicants === 0 ? (
            <div className="py-8 text-center">
              <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No data yet</p>
              <p className="text-sm text-muted-foreground">Analytics will appear once you have applicants</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hiringFunnel.map((stage) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{stage.stage}</span>
                    <span className="text-muted-foreground">
                      {stage.count} candidates ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={stage.percentage} className="h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}
