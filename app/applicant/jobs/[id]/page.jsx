"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  Building2,
  MapPin,
  Clock,
  Users,
  Share2,
  CheckCircle2,
  Award,
  Loader2,
  AlertCircle,
  Briefcase,
  Mail,
  RefreshCw,
  FileText,
  Upload,
  ExternalLink,
  User,
  Eye,
} from "lucide-react"
import { doc, getDoc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadResume } from "@/lib/supabase"

export default function JobDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [job, setJob] = useState(null)
  const [similarJobs, setSimilarJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // User/Applicant data
  const [userData, setUserData] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isUploadingCV, setIsUploadingCV] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

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

  // Get experience level display
  const getExperienceLabel = (exp) => {
    const labels = {
      entry: "Entry Level",
      mid: "Mid-Level",
      senior: "Senior Level",
      lead: "Lead",
      executive: "Executive",
    }
    return labels[exp] || exp || "Not specified"
  }

  // Fetch user/applicant data
  const fetchUserData = async () => {
    try {
      const uid = localStorage.getItem("userId")
      if (!uid) return null
      
      setUserId(uid)
      const userDoc = await getDoc(doc(db, "users", uid))
      
      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData(data)
        return data
      }
      return null
    } catch (err) {
      console.error("Error fetching user data:", err)
      return null
    }
  }

  // Increment view count
  const incrementViewCount = async (jobId) => {
    try {
      const viewedKey = `job_viewed_${jobId}`
      const alreadyViewed = sessionStorage.getItem(viewedKey)
      
      if (!alreadyViewed) {
        const jobRef = doc(db, "jobs", jobId)
        await updateDoc(jobRef, {
          views: increment(1)
        })
        sessionStorage.setItem(viewedKey, "true")
        console.log("✅ View count incremented for job:", jobId)
      }
    } catch (error) {
      console.error("Error incrementing view count:", error)
    }
  }

  // Handle CV upload
  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to upload your CV.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingCV(true)
    try {
      const url = await uploadResume(userId, file)
      
      // Save to Firebase
      await updateDoc(doc(db, "users", userId), {
        resumeUrl: url,
        resumeName: file.name,
        updatedAt: serverTimestamp(),
      })

      // Update local state
      setUserData(prev => ({
        ...prev,
        resumeUrl: url,
        resumeName: file.name,
      }))

      toast({
        title: "✅ CV Uploaded!",
        description: "Your resume has been saved to your profile.",
      })
    } catch (error) {
      console.error("CV upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload CV.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCV(false)
    }
  }

  // Fetch job data from Firestore
  const fetchJob = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch user data first
      await fetchUserData()
      
      const jobDoc = await getDoc(doc(db, "jobs", params.id))
      
      if (!jobDoc.exists()) {
        setError("Job not found")
        setIsLoading(false)
        return
      }
      
      const data = jobDoc.data()
      
      // Check if job is active
      if (data.status !== "active") {
        setError("This job is no longer available")
        setIsLoading(false)
        return
      }
      
      // Increment view count
      await incrementViewCount(params.id)
      
      // Check if user has already applied
      const applicantsArray = Array.isArray(data.applicants) ? data.applicants : []
      const currentUserId = localStorage.getItem("userId")
      if (currentUserId) {
        const alreadyApplied = applicantsArray.some(
          (applicant) => applicant.applicantId === currentUserId
        )
        setHasApplied(alreadyApplied)
      }
      
      const jobData = {
        id: jobDoc.id,
        title: data.jobtitle || data.title || "Untitled Job",
        company: data.companyName || "Company",
        location: data.location || "Not specified",
        salary: data.salary || "Competitive",
        type: data.type || "Full-time",
        experience: getExperienceLabel(data.experience),
        posted: getTimeAgo(data.createdAt?.toDate?.() || new Date(data.postedDate)),
        applicants: applicantsArray.length,
        views: (data.views || 0) + 1, // Show updated count
        department: data.department || "General",
        description: data.description || "No description provided.",
        responsibilities: data.responsibilities || [],
        requirements: data.requirements || [],
        skills: data.skills || [],
        benefits: data.benefits || "",
        positions: data.positions || 1,
        deadline: data.deadline || null,
        applicationEmail: data.applicationEmail || "",
        recruiterName: data.recruiterName || "",
      }
      
      setJob(jobData)
      
      // Fetch similar jobs
      try {
        const similarQuery = query(
          collection(db, "jobs"),
          where("status", "==", "active"),
          limit(5)
        )
        
        const similarSnapshot = await getDocs(similarQuery)
        const similar = similarSnapshot.docs
          .filter(doc => doc.id !== params.id)
          .slice(0, 3)
          .map(doc => {
            const d = doc.data()
            return {
              id: doc.id,
              title: d.jobtitle || d.title || "Untitled Job",
              company: d.companyName || "Company",
              location: d.location || "Not specified",
              salary: d.salary || "Competitive",
              type: d.type || "full-time",
            }
          })
        
        setSimilarJobs(similar)
      } catch (err) {
        console.log("Could not fetch similar jobs:", err)
      }
      
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

  // Handle share
  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast({
      title: "Link Copied!",
      description: "Job link has been copied to clipboard.",
    })
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
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/applicant/jobs">
          <Button variant="ghost" size="sm">
            ← Back to Jobs
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">{error}</h2>
            <p className="mt-2 text-center text-muted-foreground">
              The job you're looking for might have been removed or is no longer available.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/applicant/jobs">
                <Button>Browse Jobs</Button>
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

  // Parse benefits if it's a string
  const benefitsList = typeof job.benefits === 'string' 
    ? job.benefits.split('\n').filter(b => b.trim())
    : Array.isArray(job.benefits) ? job.benefits : []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back Button */}
      <Link href="/applicant/jobs">
        <Button variant="ghost" size="sm">
          ← Back to Jobs
        </Button>
      </Link>

      {/* Job Header */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Company Logo and Basic Info */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary font-bold text-2xl">
                  {job.company?.charAt(0) || "C"}
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
                  <p className="text-lg font-medium text-muted-foreground">{job.company}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="capitalize">{job.type}</Badge>
                    <Badge variant="secondary">{job.experience}</Badge>
                    <Badge variant="outline" className="capitalize">{job.department}</Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={handleShare} title="Share Job">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Your Profile & CV Section */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {userData?.avatarUrl ? (
                    <img 
                      src={userData.avatarUrl} 
                      alt="Profile" 
                      className="h-14 w-14 rounded-full object-cover border-2 border-primary"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {userData?.name || "Complete your profile"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userData?.professionalTitle || "Add your professional title"}
                    </p>
                    {userData?.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {userData.location}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* CV Status */}
                <div className="flex flex-wrap items-center gap-3">
                  {userData?.resumeUrl ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">CV Ready</span>
                      </div>
                      <a href={userData.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2">
                        <FileText className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">No CV</span>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleCVUpload}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          disabled={isUploadingCV}
                        />
                        <Button variant="outline" size="sm" disabled={isUploadingCV}>
                          {isUploadingCV ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="mr-1 h-3 w-3" />
                          )}
                          {isUploadingCV ? "Uploading..." : "Upload CV"}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {hasApplied ? (
                    <Button size="lg" disabled className="bg-green-600 hover:bg-green-600 cursor-not-allowed">
                      ✓ Already Applied
                    </Button>
                  ) : (
                    <Link href={`/applicant/jobs/${job.id}/apply`}>
                      <Button size="lg">Apply Now</Button>
                    </Link>
                  )}
                </div>
              </div>
              
              {/* User Skills Match */}
              {userData?.skills && userData.skills.length > 0 && job.skills && job.skills.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Your matching skills:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {userData.skills
                      .filter(skill => job.skills.some(jobSkill => 
                        jobSkill.toLowerCase().includes(skill.toLowerCase()) || 
                        skill.toLowerCase().includes(jobSkill.toLowerCase())
                      ))
                      .slice(0, 6)
                      .map((skill) => (
                        <Badge key={skill} variant="default" className="text-xs bg-green-600">
                          {skill}
                        </Badge>
                      ))}
                    {userData.skills
                      .filter(skill => !job.skills.some(jobSkill => 
                        jobSkill.toLowerCase().includes(skill.toLowerCase()) || 
                        skill.toLowerCase().includes(jobSkill.toLowerCase())
                      ))
                      .slice(0, 4)
                      .map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium text-foreground">{job.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <span className="text-sm font-bold text-primary">AED</span>
                <div>
                  <p className="text-sm text-muted-foreground">Salary (Monthly)</p>
                  <p className="font-medium text-foreground">{job.salary}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Applicants</p>
                  <p className="font-medium text-foreground">{job.applicants} applied</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="font-medium text-foreground">{job.views} views</p>
                </div>
              </div>
            </div>

            {/* Skills Tags */}
            {job.skills && job.skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2 overflow-hidden">
          {/* About Company */}
          <Card>
            <CardHeader>
              <CardTitle>About {job.company}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">
                {job.company} is hiring for this position. Apply now to join their team!
              </p>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{job.description}</p>
            </CardContent>
          </Card>

          {/* Responsibilities */}
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

          {/* Requirements */}
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

          {/* Benefits */}
          {benefitsList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {benefitsList.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-chart-3" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* If benefits is just a string paragraph */}
          {typeof job.benefits === 'string' && job.benefits && benefitsList.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{job.benefits}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:scrollbar-thin">
          {/* Apply Card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {hasApplied ? (
                  <Button className="w-full bg-green-600 hover:bg-green-600 cursor-not-allowed" size="lg" disabled>
                    ✓ Already Applied
                  </Button>
                ) : (
                  <Link href={`/applicant/jobs/${job.id}/apply`}>
                    <Button className="w-full" size="lg">
                      Apply for this position
                    </Button>
                  </Link>
                )}
                <Separator />
                <div className="space-y-2 text-center text-sm text-muted-foreground">
                  <p>{job.applicants} people have applied</p>
                  <p className="flex items-center justify-center gap-1">
                    <Eye className="h-3 w-3" />
                    {job.views} views
                  </p>
                  {job.positions > 1 && (
                    <p className="text-xs">{job.positions} positions available</p>
                  )}
                  {job.deadline && (
                    <p className="text-xs">
                      Applications close on {new Date(job.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{job.type}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Experience:</span>
                <span className="font-medium">{job.experience}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium capitalize">{job.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Posted:</span>
                <span className="font-medium">{job.posted}</span>
              </div>
              {job.applicationEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-primary">{job.applicationEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Similar Jobs */}
          {similarJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Similar Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {similarJobs.map((similar) => (
                  <Link key={similar.id} href={`/applicant/jobs/${similar.id}`}>
                    <div className="space-y-2 rounded-lg border p-3 transition-all hover:shadow-md hover:border-primary/50">
                      <h4 className="font-medium text-foreground hover:text-primary">{similar.title}</h4>
                      <p className="text-sm text-muted-foreground">{similar.company}</p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {similar.location}
                        </span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {similar.type?.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Your CV Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userData?.resumeUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {userData.resumeName || "Resume.pdf"}
                      </p>
                      <p className="text-sm text-muted-foreground">Ready to submit</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={userData.resumeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View CV
                      </Button>
                    </a>
                    <div className="relative flex-1">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleCVUpload}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={isUploadingCV}
                      />
                      <Button variant="outline" size="sm" className="w-full" disabled={isUploadingCV}>
                        {isUploadingCV ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Replace
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleCVUpload}
                      className="absolute inset-0 cursor-pointer opacity-0 z-10"
                      disabled={isUploadingCV}
                    />
                    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 transition-colors hover:border-primary hover:bg-primary/5">
                      {isUploadingCV ? (
                        <>
                          <Loader2 className="h-10 w-10 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">Upload your resume</p>
                            <p className="text-sm text-muted-foreground">
                              Drag and drop or click to browse
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Accepted formats: PDF, DOC, DOCX • Max size: 10MB
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Not Logged In Card */}
          {!userData && !isLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <User className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 font-medium">Not Logged In</p>
                <p className="text-sm text-muted-foreground">Login to apply for this job</p>
                <Link href="/login">
                  <Button className="mt-4 w-full">Login</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
