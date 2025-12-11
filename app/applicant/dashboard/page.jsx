"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Briefcase, FileText, Calendar, TrendingUp, MapPin, Clock, Loader2, RefreshCw, CheckCircle2, Star } from "lucide-react"
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ApplicantDashboard() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const [userData, setUserData] = useState(null)
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    shortlisted: 0,
    hired: 0,
  })
  const [recentApplications, setRecentApplications] = useState([])
  const [recommendedJobs, setRecommendedJobs] = useState([])
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [missingProfileItems, setMissingProfileItems] = useState([])

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const userId = localStorage.getItem("userId")
      const name = localStorage.getItem("userName") || "User"
      setUserName(name)

      if (!userId) {
        setIsLoading(false)
        return
      }

      // Fetch user data
      const userDoc = await getDoc(doc(db, "users", userId))
      if (userDoc.exists()) {
        const user = userDoc.data()
        setUserData(user)
        
        // Calculate profile completion
        const completionItems = [
          { name: "Name", completed: !!user.name },
          { name: "Email", completed: !!user.email },
          { name: "Phone", completed: !!user.phone },
          { name: "Location", completed: !!user.location },
          { name: "Professional Title", completed: !!user.professionalTitle },
          { name: "Bio", completed: !!user.bio },
          { name: "Skills", completed: user.skills?.length > 0 },
          { name: "LinkedIn", completed: !!user.linkedIn },
          { name: "Experience", completed: user.experiences?.length > 0 },
          { name: "Education", completed: user.education?.length > 0 },
          { name: "Resume", completed: !!user.resumeUrl },
        ]
        
        const completedCount = completionItems.filter(item => item.completed).length
        setProfileCompletion(Math.round((completedCount / completionItems.length) * 100))
        setMissingProfileItems(completionItems.filter(item => !item.completed).map(item => item.name))
      }

      // Fetch applications from jobs collection
      const allJobsSnapshot = await getDocs(collection(db, "jobs"))
      const applications = []
      
      allJobsSnapshot.docs.forEach((jobDoc) => {
        const jobData = jobDoc.data()
        const applicantsArray = jobData.applicants || []
        
        // Find if current user has applied to this job
        const userApplication = applicantsArray.find(
          (applicant) => applicant.applicantId === userId
        )
        
        if (userApplication) {
          applications.push({
            id: `${jobDoc.id}_${userId}`,
            jobId: jobDoc.id,
            jobTitle: jobData.jobtitle || jobData.title || "Untitled Job",
            jobCompany: jobData.companyName || "Company",
            status: userApplication.status || "applied",
            appliedAt: userApplication.appliedAt ? new Date(userApplication.appliedAt) : new Date(),
          })
        }
      })
      
      // Sort by date and get recent 3
      applications.sort((a, b) => {
        const dateA = a.appliedAt || new Date(0)
        const dateB = b.appliedAt || new Date(0)
        return dateB - dateA
      })
      
      const interviews = applications.filter(app => app.status === "interview_scheduled").length
      const shortlisted = applications.filter(app => app.status === "shortlisted").length
      const hired = applications.filter(app => app.status === "hired").length
      
      setStats({
        applications: applications.length,
        interviews: interviews,
        shortlisted: shortlisted,
        hired: hired,
      })
      
      // Format recent applications
      const recent = applications.slice(0, 4).map(app => ({
        id: app.id,
        title: app.jobTitle,
        company: app.jobCompany,
        status: app.status,
        appliedDate: getTimeAgo(app.appliedAt),
        jobId: app.jobId,
      }))
      setRecentApplications(recent)

      // Fetch recommended jobs (active jobs user hasn't applied to)
      const jobsQuery = query(
        collection(db, "jobs"),
        where("status", "==", "active"),
        limit(10)
      )
      const jobsSnapshot = await getDocs(jobsQuery)
      const appliedJobIds = applications.map(a => a.jobId)
      
      const jobs = jobsSnapshot.docs
        .filter(doc => !appliedJobIds.includes(doc.id))
        .slice(0, 3)
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.jobtitle || data.title || "Untitled Job",
            company: data.companyName || "Company",
            location: data.location || "Not specified",
            salary: data.salary || "Competitive",
            type: data.type || "Full-time",
            posted: getTimeAgo(data.createdAt?.toDate?.()),
          }
        })
      setRecommendedJobs(jobs)

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get time ago string
  const getTimeAgo = (date) => {
    if (!date) return "Recently"
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / 86400000)
    const weeks = Math.floor(days / 7)
    
    if (days < 1) return "Today"
    if (days === 1) return "1 day ago"
    if (days < 7) return `${days} days ago`
    if (weeks === 1) return "1 week ago"
    return `${weeks} weeks ago`
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

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
      interview_scheduled: "Interview",
      rejected: "Rejected",
      hired: "Hired",
    }
    return labels[status] || "Applied"
  }

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

  const dashboardStats = [
    { icon: FileText, label: "Applications", value: stats.applications.toString(), change: `${stats.applications} total`, color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { icon: Star, label: "Shortlisted", value: stats.shortlisted.toString(), change: stats.shortlisted > 0 ? "Looking good!" : "Keep applying", color: "text-green-600", bgColor: "bg-green-500/10" },
    { icon: Calendar, label: "Interviews", value: stats.interviews.toString(), change: stats.interviews > 0 ? "Upcoming" : "None yet", color: "text-purple-600", bgColor: "bg-purple-500/10" },
    { icon: CheckCircle2, label: "Hired", value: stats.hired.toString(), change: stats.hired > 0 ? "Congratulations!" : "Keep trying", color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {userName.split(" ")[0]}!</h1>
          <p className="mt-2 text-muted-foreground">Here's what's happening with your job search today.</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.change}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor} ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Hired Celebration */}
      {stats.hired > 0 && (
        <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="text-3xl">🎉</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  Congratulations on getting hired!
                </h3>
                <p className="text-emerald-600 dark:text-emerald-500">
                  You've been hired for {stats.hired} position{stats.hired > 1 ? 's' : ''}. Best of luck in your new role!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Track your latest job applications</CardDescription>
              </div>
              <Link href="/applicant/applications">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">No applications yet</p>
                <Link href="/applicant/jobs">
                  <Button variant="outline" className="mt-4">Start Applying</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="flex items-start gap-4 rounded-lg border p-4 transition-all hover:shadow-sm">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                      {app.company?.charAt(0) || "C"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/applicant/jobs/${app.jobId}`}>
                            <h4 className="font-semibold text-foreground hover:text-primary">{app.title}</h4>
                          </Link>
                          <p className="text-sm text-muted-foreground">{app.company}</p>
                        </div>
                        <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Applied {app.appliedDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Completion */}
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>Improve your chances of getting hired</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile Completion</span>
                <span className="font-medium text-foreground">{profileCompletion}%</span>
              </div>
              <Progress value={profileCompletion} className="h-2" />
            </div>
            {profileCompletion === 100 ? (
              <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  ✅ Your profile is complete!
                </p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  You're ready to apply for jobs.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Complete these steps:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {missingProfileItems.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-orange-500">○</span> Add {item.toLowerCase()}
                    </li>
                  ))}
                  {missingProfileItems.length > 4 && (
                    <li className="flex items-center gap-2 text-xs">
                      <span>...</span> and {missingProfileItems.length - 4} more
                    </li>
                  )}
                </ul>
              </div>
            )}
            <Link href="/applicant/profile">
              <Button variant="outline" className="w-full bg-transparent">
                {profileCompletion < 100 ? "Complete Profile" : "Edit Profile"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recommended for You</CardTitle>
              <CardDescription>Jobs you haven't applied to yet</CardDescription>
            </div>
            <Link href="/applicant/jobs">
              <Button variant="outline" size="sm">
                Browse All Jobs
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recommendedJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No new job recommendations</p>
              <p className="text-sm text-muted-foreground">You may have applied to all available jobs!</p>
              <Link href="/applicant/jobs">
                <Button variant="outline" className="mt-4">Browse Jobs</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedJobs.map((job) => (
                <div key={job.id} className="space-y-3 rounded-lg border p-4 transition-all hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-foreground">{job.title}</h4>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">AED</span>
                      {job.salary}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Posted {job.posted}
                    </div>
                  </div>
                  <Link href={`/applicant/jobs/${job.id}`}>
                    <Button className="w-full" size="sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/applicant/jobs">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Briefcase className="h-6 w-6" />
                <span>Browse Jobs</span>
              </Button>
            </Link>
            <Link href="/applicant/applications">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <FileText className="h-6 w-6" />
                <span>My Applications</span>
              </Button>
            </Link>
            <Link href="/applicant/interviews">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Calendar className="h-6 w-6" />
                <span>Interviews</span>
              </Button>
            </Link>
            <Link href="/applicant/profile">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span>My Profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
