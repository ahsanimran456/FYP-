import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Briefcase, Users, Eye, TrendingUp, Clock, CheckCircle2, Calendar, ArrowUpRight, Plus } from "lucide-react"

export default function RecruiterDashboard() {
  const stats = [
    { icon: Briefcase, label: "Active Jobs", value: "12", change: "+2 this week", trend: "up", color: "text-blue-600" },
    {
      icon: Users,
      label: "Total Applicants",
      value: "248",
      change: "+45 this week",
      trend: "up",
      color: "text-green-600",
    },
    { icon: Eye, label: "Profile Views", value: "1,847", change: "+12.5%", trend: "up", color: "text-accent" },
    { icon: CheckCircle2, label: "Hired", value: "18", change: "3 this month", trend: "up", color: "text-chart-4" },
  ]

  const activeJobs = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      location: "San Francisco, CA",
      type: "Full-time",
      posted: "2 days ago",
      applicants: 45,
      newApplicants: 8,
      views: 342,
      status: "Active",
    },
    {
      id: 2,
      title: "Full Stack Engineer",
      location: "Remote",
      type: "Full-time",
      posted: "1 week ago",
      applicants: 62,
      newApplicants: 12,
      views: 521,
      status: "Active",
    },
    {
      id: 3,
      title: "Product Designer",
      location: "New York, NY",
      type: "Full-time",
      posted: "3 days ago",
      applicants: 38,
      newApplicants: 5,
      views: 289,
      status: "Active",
    },
  ]

  const recentApplicants = [
    {
      id: 1,
      name: "Sarah Johnson",
      position: "Senior Frontend Developer",
      appliedDate: "2 hours ago",
      experience: "6 years",
      matchScore: 95,
      status: "New",
    },
    {
      id: 2,
      name: "Michael Chen",
      position: "Full Stack Engineer",
      appliedDate: "5 hours ago",
      experience: "4 years",
      matchScore: 88,
      status: "New",
    },
    {
      id: 3,
      name: "Emily Davis",
      position: "Product Designer",
      appliedDate: "1 day ago",
      experience: "5 years",
      matchScore: 92,
      status: "Reviewed",
    },
    {
      id: 4,
      name: "James Wilson",
      position: "Senior Frontend Developer",
      appliedDate: "1 day ago",
      experience: "7 years",
      matchScore: 90,
      status: "Shortlisted",
    },
  ]

  const upcomingInterviews = [
    {
      id: 1,
      candidate: "Alex Thompson",
      position: "Full Stack Engineer",
      date: "Today",
      time: "2:00 PM",
      type: "Technical Interview",
    },
    {
      id: 2,
      candidate: "Rachel Green",
      position: "Senior Frontend Developer",
      date: "Tomorrow",
      time: "10:00 AM",
      type: "Phone Screen",
    },
    {
      id: 3,
      candidate: "David Kim",
      position: "Product Designer",
      date: "Friday",
      time: "3:00 PM",
      type: "Portfolio Review",
    },
  ]

  const hiringFunnel = [
    { stage: "Applications", count: 248, percentage: 100 },
    { stage: "Screening", count: 124, percentage: 50 },
    { stage: "Interviews", count: 45, percentage: 18 },
    { stage: "Offers", count: 12, percentage: 5 },
    { stage: "Hired", count: 8, percentage: 3 },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "New":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "Reviewed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      case "Shortlisted":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recruiter Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Welcome back! Here&apos;s an overview of your hiring activities.</p>
        </div>
        <Link href="/recruiter/jobs/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
              {activeJobs.map((job) => (
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
              ))}
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
              {upcomingInterviews.map((interview) => (
                <div key={interview.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback>
                        {interview.candidate
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
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
                  <Badge variant="outline" className="text-xs">
                    {interview.type}
                  </Badge>
                </div>
              ))}
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
            {recentApplicants.map((applicant) => (
              <div key={applicant.id} className="flex items-center gap-4 rounded-lg border p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder.svg?height=48&width=48" />
                  <AvatarFallback>
                    {applicant.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/recruiter/candidates/${applicant.id}`}>
                        <h4 className="font-semibold text-foreground hover:text-primary">{applicant.name}</h4>
                      </Link>
                      <p className="text-sm text-muted-foreground">Applied for {applicant.position}</p>
                    </div>
                    <Badge className={getStatusColor(applicant.status)}>{applicant.status}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{applicant.experience} experience</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {applicant.matchScore}% match
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {applicant.appliedDate}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    View Profile
                  </Button>
                  <Button size="sm">Review</Button>
                </div>
              </div>
            ))}
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
          <div className="space-y-4">
            {hiringFunnel.map((stage, index) => (
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
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}
