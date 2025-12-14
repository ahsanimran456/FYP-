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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Recruiter Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your hiring activities.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/recruiter/jobs/new">
            <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300">
              <Plus className="h-5 w-5" />
              Create Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat, index) => {
          const Icon = stat.icon
          const gradients = [
            "from-blue-500 to-blue-600",
            "from-emerald-500 to-emerald-600",
            "from-violet-500 to-violet-600",
            "from-amber-500 to-amber-600",
          ]
          return (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", gradients[index])} />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold text-foreground tracking-tight">{stat.value}</p>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {stat.change}
                    </p>
                  </div>
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg", gradients[index])}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Jobs */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Active Job Postings</CardTitle>
                <CardDescription>Manage your current job listings</CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/recruiter/jobs/new">
                  <Button size="sm" className="gap-2 shadow-md">
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
                <div className="py-12 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No active jobs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Start by posting your first job</p>
                  <Link href="/recruiter/jobs/new" className="mt-4 inline-block">
                    <Button className="shadow-md">Post Your First Job</Button>
                  </Link>
                </div>
              ) : (
                activeJobs.map((job) => (
                  <div key={job.id} className="group rounded-xl border-2 border-transparent hover:border-primary/20 bg-muted/30 hover:bg-muted/50 p-5 transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link href={`/recruiter/jobs/${job.id}`}>
                              <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{job.title}</h4>
                            </Link>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {job.location} • {job.type}
                            </p>
                          </div>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">{job.status}</Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-6">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Applicants</p>
                            <p className="text-xl font-bold text-foreground">
                              {job.applicants}
                              {job.newApplicants > 0 && (
                                <span className="ml-2 text-sm font-medium text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">+{job.newApplicants}</span>
                              )}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Views</p>
                            <p className="text-xl font-bold text-foreground">{job.views}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Posted</p>
                            <p className="text-sm font-medium text-foreground">{job.posted}</p>
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
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Upcoming Interviews</CardTitle>
                <CardDescription>Your scheduled interviews</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingInterviews.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No upcoming interviews</p>
                  <p className="text-xs text-muted-foreground mt-1">Schedule interviews from candidates page</p>
                </div>
              ) : (
                upcomingInterviews.map((interview) => (
                  <div key={interview.id} className="group rounded-xl bg-gradient-to-r from-purple-500/5 to-transparent hover:from-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 p-4 transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 border-2 border-purple-500/20">
                        <AvatarImage src="/placeholder.svg?height=40&width=40" />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-sm font-semibold">
                          {interview.candidate
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{interview.candidate}</h4>
                        <p className="text-xs text-muted-foreground truncate">{interview.position}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-500/10 px-2 py-1 rounded-full">
                            <Calendar className="h-3 w-3" />
                            {interview.date}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            <Clock className="h-3 w-3" />
                            {interview.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Link href="/recruiter/interviews">
                <Button variant="outline" className="w-full mt-2 hover:bg-purple-500/5 hover:text-purple-600 hover:border-purple-500/30" size="sm">
                  View All Interviews
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Applicants */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Recent Applicants</CardTitle>
                <CardDescription>Latest candidates who applied to your jobs</CardDescription>
              </div>
            </div>
            <Link href="/recruiter/candidates">
              <Button variant="outline" size="sm" className="hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/30">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplicants.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">No applicants yet</p>
                <p className="text-sm text-muted-foreground mt-1">Post a job to start receiving applications</p>
              </div>
            ) : (
              recentApplicants.map((applicant) => (
                <div key={applicant.id} className="group flex items-center gap-4 rounded-xl border-2 border-transparent hover:border-blue-500/20 bg-muted/30 hover:bg-muted/50 p-4 transition-all duration-300">
                  <Avatar className="h-14 w-14 border-2 border-blue-500/20">
                    {applicant.avatar ? (
                      <AvatarImage src={applicant.avatar} />
                    ) : (
                      <AvatarImage src="/placeholder.svg?height=56&width=56" />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {applicant.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/recruiter/candidates/${applicant.jobId}/${applicant.applicantId}`}>
                          <h4 className="font-bold text-foreground group-hover:text-blue-600 transition-colors truncate">{applicant.name}</h4>
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">Applied for {applicant.position}</p>
                      </div>
                      <Badge className={cn(getStatusColor(applicant.status), "shrink-0")}>{getStatusLabel(applicant.status)}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded-full text-xs">{getExperienceLabel(applicant.experience)}</span>
                      {applicant.matchScore > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-medium">
                          <TrendingUp className="h-3 w-3" />
                          {applicant.matchScore}% AI Match
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Clock className="h-3 w-3" />
                        {applicant.appliedDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/recruiter/candidates/${applicant.jobId}/${applicant.applicantId}`}>
                      <Button size="sm" variant="outline" className="hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/30">
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
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold">Hiring Funnel Analytics</CardTitle>
              <CardDescription>Track candidates through your hiring process</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hiringFunnel.length === 0 || stats.totalApplicants === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No data yet</p>
              <p className="text-sm text-muted-foreground mt-1">Analytics will appear once you have applicants</p>
            </div>
          ) : (
            <div className="space-y-6">
              {hiringFunnel.map((stage, index) => {
                const colors = [
                  "from-blue-500 to-blue-600",
                  "from-violet-500 to-violet-600",
                  "from-amber-500 to-amber-600",
                  "from-purple-500 to-purple-600",
                  "from-emerald-500 to-emerald-600",
                ]
                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">{stage.count}</span>
                        <span className="text-sm text-muted-foreground">({stage.percentage}%)</span>
                      </div>
                    </div>
                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", colors[index])}
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
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
