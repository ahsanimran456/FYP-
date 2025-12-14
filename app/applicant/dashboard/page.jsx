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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Welcome back, {userName.split(" ")[0]}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your job search today.</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData} disabled={isLoading} className="shadow-sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, index) => {
          const Icon = stat.icon
          const gradients = [
            "from-blue-500 to-blue-600",
            "from-emerald-500 to-emerald-600",
            "from-purple-500 to-purple-600",
            "from-amber-500 to-amber-600",
          ]
          return (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className={`absolute inset-0 bg-gradient-to-br opacity-5 ${gradients[index]}`} />
              <CardContent className="p-6 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold text-foreground tracking-tight">{stat.value}</p>
                    <p className="text-xs font-medium text-muted-foreground">{stat.change}</p>
                  </div>
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${gradients[index]}`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Hired Celebration */}
      {stats.hired > 0 && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTItMi00LTItNC0yczIgMiAyIDRjMCAyLTIgNC0yIDRzMiAyIDQgMmMyIDIgNCAyIDQgMnMtMi0yLTItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
                <span className="text-4xl">🎉</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white">
                  Congratulations on getting hired!
                </h3>
                <p className="text-white/90">
                  You've been hired for {stats.hired} position{stats.hired > 1 ? 's' : ''}. Best of luck in your new role!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">Recent Applications</CardTitle>
                  <CardDescription>Track your latest job applications</CardDescription>
                </div>
              </div>
              <Link href="/applicant/applications">
                <Button variant="outline" size="sm" className="hover:bg-blue-500/5 hover:text-blue-600 hover:border-blue-500/30">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">No applications yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start exploring jobs and apply</p>
                <Link href="/applicant/jobs">
                  <Button className="mt-4 shadow-md">Start Applying</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="group flex items-start gap-4 rounded-xl border-2 border-transparent hover:border-blue-500/20 bg-muted/30 hover:bg-muted/50 p-4 transition-all duration-300">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold shadow-lg">
                      {app.company?.charAt(0) || "C"}
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/applicant/jobs/${app.jobId}`}>
                            <h4 className="font-bold text-foreground group-hover:text-blue-600 transition-colors truncate">{app.title}</h4>
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">{app.company}</p>
                        </div>
                        <Badge className={`${getStatusColor(app.status)} shrink-0`}>{getStatusLabel(app.status)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Applied {app.appliedDate}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Completion */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Profile Completion</CardTitle>
                <CardDescription>Improve your chances of getting hired</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">Completion</span>
                <span className="text-2xl font-bold text-foreground">{profileCompletion}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            {profileCompletion === 100 ? (
              <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Profile complete!
                  </p>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 ml-7">
                  You're ready to apply for jobs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Complete these steps:</p>
                <ul className="space-y-2">
                  {missingProfileItems.slice(0, 4).map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      Add {item.toLowerCase()}
                    </li>
                  ))}
                  {missingProfileItems.length > 4 && (
                    <li className="text-xs text-muted-foreground pl-3">
                      + {missingProfileItems.length - 4} more items
                    </li>
                  )}
                </ul>
              </div>
            )}
            <Link href="/applicant/profile">
              <Button className="w-full mt-2 shadow-md" variant={profileCompletion < 100 ? "default" : "outline"}>
                {profileCompletion < 100 ? "Complete Profile" : "Edit Profile"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Jobs */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Recommended for You</CardTitle>
                <CardDescription>Jobs you haven't applied to yet</CardDescription>
              </div>
            </div>
            <Link href="/applicant/jobs">
              <Button variant="outline" size="sm" className="hover:bg-emerald-500/5 hover:text-emerald-600 hover:border-emerald-500/30">
                Browse All Jobs
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recommendedJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No new job recommendations</p>
              <p className="text-sm text-muted-foreground mt-1">You may have applied to all available jobs!</p>
              <Link href="/applicant/jobs">
                <Button className="mt-4 shadow-md">Browse Jobs</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendedJobs.map((job) => (
                <div key={job.id} className="group space-y-4 rounded-xl border-2 border-transparent hover:border-emerald-500/20 bg-muted/30 hover:bg-emerald-500/5 p-5 transition-all duration-300">
                  <div>
                    <h4 className="font-bold text-lg text-foreground group-hover:text-emerald-600 transition-colors">{job.title}</h4>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{job.company}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">AED</span>
                      <span className="text-foreground font-medium">{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Posted {job.posted}
                    </div>
                  </div>
                  <Link href={`/applicant/jobs/${job.id}`}>
                    <Button className="w-full shadow-md" size="sm">
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
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/applicant/jobs">
              <div className="group flex flex-col items-center gap-3 rounded-xl border-2 border-transparent hover:border-blue-500/20 bg-muted/30 hover:bg-blue-500/5 p-6 transition-all duration-300 cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <span className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">Browse Jobs</span>
              </div>
            </Link>
            <Link href="/applicant/applications">
              <div className="group flex flex-col items-center gap-3 rounded-xl border-2 border-transparent hover:border-emerald-500/20 bg-muted/30 hover:bg-emerald-500/5 p-6 transition-all duration-300 cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <span className="font-semibold text-foreground group-hover:text-emerald-600 transition-colors">My Applications</span>
              </div>
            </Link>
            <Link href="/applicant/interviews">
              <div className="group flex flex-col items-center gap-3 rounded-xl border-2 border-transparent hover:border-purple-500/20 bg-muted/30 hover:bg-purple-500/5 p-6 transition-all duration-300 cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <span className="font-semibold text-foreground group-hover:text-purple-600 transition-colors">Interviews</span>
              </div>
            </Link>
            <Link href="/applicant/profile">
              <div className="group flex flex-col items-center gap-3 rounded-xl border-2 border-transparent hover:border-amber-500/20 bg-muted/30 hover:bg-amber-500/5 p-6 transition-all duration-300 cursor-pointer">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <span className="font-semibold text-foreground group-hover:text-amber-600 transition-colors">My Profile</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
