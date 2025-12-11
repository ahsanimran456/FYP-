"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Search, MapPin, Clock, Briefcase, Building2, Heart, X, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function JobsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState({
    jobType: "all",
    location: "all",
    experience: "all",
    salary: "all",
  })
  const [savedJobs, setSavedJobs] = useState([])
  const [appliedJobs, setAppliedJobs] = useState([])
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // Fetch jobs from Firestore
  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      
      // Get user ID from localStorage
      const uid = localStorage.getItem("userId")
      setUserId(uid)
      
      // Fetch user's saved jobs if logged in
      if (uid) {
        const userDoc = await getDoc(doc(db, "users", uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setSavedJobs(userData.savedJobs || [])
        }
      }
      
      // Fetch all active jobs
      const jobsQuery = query(
        collection(db, "jobs"),
        where("status", "==", "active")
      )
      
      const snapshot = await getDocs(jobsQuery)
      const appliedJobIds = []
      const now = new Date()
      
      const jobsData = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data()
          const applicantsArray = Array.isArray(data.applicants) ? data.applicants : []
          
          // Check if job is expired (2 weeks old)
          const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
          const isExpired = expiryDate && now > expiryDate
          
          // Check deadline passed
          const deadline = data.deadline ? new Date(data.deadline) : null
          const deadlinePassed = deadline && now > deadline
          
          // Skip expired jobs
          if (isExpired) return null
          
          // Check if user has applied to this job
          if (uid && applicantsArray.some(applicant => applicant.applicantId === uid)) {
            appliedJobIds.push(docSnapshot.id)
          }
          
          return {
            id: docSnapshot.id,
            title: data.jobtitle || data.title || "Untitled Job",
            company: data.companyName || "Company",
            location: data.location || "Not specified",
            salary: data.salary || "Competitive",
            type: data.type || "full-time",
            experience: data.experience || "mid",
            posted: getTimeAgo(data.createdAt?.toDate?.() || new Date(data.postedDate)),
            applicants: applicantsArray.length,
            skills: data.skills || [],
            description: data.description || "",
            department: data.department || "General",
            salaryMin: data.salaryMin,
            salaryMax: data.salaryMax,
            deadline: data.deadline,
            deadlinePassed: deadlinePassed,
          }
        })
        .filter(job => job !== null) // Remove expired jobs
      
      setAppliedJobs(appliedJobIds)
      
      // Sort by most recent
      jobsData.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))
      
      setJobs(jobsData)
      setFilteredJobs(jobsData)
      console.log("✅ Fetched", jobsData.length, "active jobs")
    } catch (error) {
      console.error("❌ Error fetching jobs:", error)
      toast({
        title: "Error loading jobs",
        description: "Failed to load jobs. Please try again.",
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

  // Filter jobs based on search and filters
  useEffect(() => {
    let result = [...jobs]
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query)) ||
          job.description.toLowerCase().includes(query)
      )
    }
    
    // Job type filter
    if (selectedFilters.jobType !== "all") {
      result = result.filter((job) => job.type === selectedFilters.jobType)
    }
    
    // Location filter
    if (selectedFilters.location !== "all") {
      if (selectedFilters.location === "remote") {
        result = result.filter((job) => job.location.toLowerCase().includes("remote"))
      } else {
        result = result.filter((job) => job.location.toLowerCase().includes(selectedFilters.location))
      }
    }
    
    // Experience filter
    if (selectedFilters.experience !== "all") {
      result = result.filter((job) => job.experience === selectedFilters.experience)
    }
    
    // Salary filter (monthly AED)
    if (selectedFilters.salary !== "all") {
      result = result.filter((job) => {
        if (!job.salaryMin) return true
        const minSalary = job.salaryMin
        
        switch (selectedFilters.salary) {
          case "0-5000":
            return minSalary < 5000
          case "5000-10000":
            return minSalary >= 5000 && minSalary < 10000
          case "10000-15000":
            return minSalary >= 10000 && minSalary < 15000
          case "15000+":
            return minSalary >= 15000
          default:
            return true
        }
      })
    }
    
    setFilteredJobs(result)
  }, [searchQuery, selectedFilters, jobs])

  // Initial fetch
  useEffect(() => {
    fetchJobs()
  }, [])

  // Toggle save job
  const toggleSaveJob = async (jobId) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to save jobs.",
        variant: "destructive",
      })
      return
    }

    try {
      const isSaved = savedJobs.includes(jobId)
      const userRef = doc(db, "users", userId)
      
      if (isSaved) {
        // Remove from saved
        await updateDoc(userRef, {
          savedJobs: arrayRemove(jobId)
        })
        setSavedJobs(savedJobs.filter((id) => id !== jobId))
        toast({
          title: "Job removed from saved",
          description: "You can find saved jobs in your profile.",
        })
      } else {
        // Add to saved
        await updateDoc(userRef, {
          savedJobs: arrayUnion(jobId)
        })
        setSavedJobs([...savedJobs, jobId])
        toast({
          title: "Job saved!",
          description: "You can find this job in your saved jobs.",
        })
      }
    } catch (error) {
      console.error("Error toggling save:", error)
      toast({
        title: "Error",
        description: "Failed to update saved jobs.",
        variant: "destructive",
      })
    }
  }

  // Get experience level label
  const getExperienceLabel = (exp) => {
    const labels = {
      entry: "Entry Level",
      mid: "Mid-Level",
      senior: "Senior",
      lead: "Lead",
      executive: "Executive",
    }
    return labels[exp] || exp
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Find Your Next Opportunity</h1>
          <p className="mt-2 text-muted-foreground">
            {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} available
          </p>
        </div>
        <Button variant="outline" onClick={fetchJobs} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by job title, company, or keywords..."
                className="pl-10 pr-4"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filters Row */}
            <div className="grid gap-4 md:grid-cols-4">
              <Select
                value={selectedFilters.jobType}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, jobType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedFilters.location}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, location: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Emirates</SelectItem>
                  <SelectItem value="abu dhabi">Abu Dhabi</SelectItem>
                  <SelectItem value="dubai">Dubai</SelectItem>
                  <SelectItem value="sharjah">Sharjah</SelectItem>
                  <SelectItem value="ajman">Ajman</SelectItem>
                  <SelectItem value="umm al quwain">Umm Al Quwain</SelectItem>
                  <SelectItem value="ras al khaimah">Ras Al Khaimah</SelectItem>
                  <SelectItem value="fujairah">Fujairah</SelectItem>
                  <SelectItem value="remote">Remote (UAE)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedFilters.experience}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, experience: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Experience Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid-Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedFilters.salary}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, salary: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Salary Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salaries</SelectItem>
                  <SelectItem value="0-5000">AED 0 - 5,000/mo</SelectItem>
                  <SelectItem value="5000-10000">AED 5,000 - 10,000/mo</SelectItem>
                  <SelectItem value="10000-15000">AED 10,000 - 15,000/mo</SelectItem>
                  <SelectItem value="15000+">AED 15,000+/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters */}
            {Object.values(selectedFilters).some((v) => v !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {Object.entries(selectedFilters).map(([key, value]) =>
                  value !== "all" ? (
                    <Badge key={key} variant="secondary" className="gap-1 pl-3 pr-1">
                      {value}
                      <button
                        onClick={() => setSelectedFilters({ ...selectedFilters, [key]: "all" })}
                        className="ml-1 rounded-sm hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null,
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSelectedFilters({ jobType: "all", location: "all", experience: "all", salary: "all" })
                  }
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No Results */}
      {filteredJobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Briefcase className="h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No jobs found</h2>
            <p className="mt-2 text-center text-muted-foreground">
              {jobs.length === 0
                ? "No jobs are currently available. Check back soon!"
                : "Try adjusting your search or filters to find more jobs."}
            </p>
            {Object.values(selectedFilters).some((v) => v !== "all") && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() =>
                  setSelectedFilters({ jobType: "all", location: "all", experience: "all", salary: "all" })
                }
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Job Listings */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-primary/10 text-primary font-bold">
                    {job.company?.charAt(0) || "C"}
                  </div>
                  <div className="flex-1">
                    <Link href={`/applicant/jobs/${job.id}`}>
                      <h3 className="font-semibold text-foreground hover:text-primary">{job.title}</h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{job.company}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleSaveJob(job.id)}
                  className={savedJobs.includes(job.id) ? "text-red-500" : ""}
                >
                  <Heart className={`h-5 w-5 ${savedJobs.includes(job.id) ? "fill-current" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Details */}
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-primary">AED</span>
                  <span>{job.salary}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  <span className="capitalize">{job.type.replace("-", " ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{job.posted}</span>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {job.skills.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {job.skills.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{job.skills.length - 4} more
                    </Badge>
                  )}
                </div>
              )}

              {/* Description Preview */}
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {job.description || "No description available."}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <Link href={`/applicant/jobs/${job.id}`} className="flex-1">
                  <Button className="w-full">View Details</Button>
                </Link>
                {appliedJobs.includes(job.id) ? (
                  <Button variant="outline" disabled className="bg-green-50 text-green-700 border-green-300">
                    ✓ Applied
                  </Button>
                ) : (
                  <Link href={`/applicant/jobs/${job.id}/apply`}>
                    <Button variant="outline">Quick Apply</Button>
                  </Link>
                )}
              </div>

              {/* Applicants Count */}
              <p className="text-center text-xs text-muted-foreground">{job.applicants} applicants</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
