"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Users,
  Copy,
  Archive,
  Trash2,
  MapPin,
  Clock,
  Loader2,
  Briefcase,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCurrentUser } from "@/lib/auth"

export default function JobsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [recruiterId, setRecruiterId] = useState(null)
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Status change state
  const [statusChangingJobId, setStatusChangingJobId] = useState(null)

  // Fetch jobs from Firestore
  const fetchJobs = async (uid) => {
    try {
      setIsLoading(true)
      
      // Query jobs collection where recruiterId matches current user
      const jobsQuery = query(
        collection(db, "jobs"),
        where("recruiterId", "==", uid)
      )
      
      const querySnapshot = await getDocs(jobsQuery)
      
      const now = new Date()
      
      const fetchedJobs = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        
        // Check expiry status
        const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
        const isExpired = expiryDate && now > expiryDate
        
        // Check deadline
        const deadline = data.deadline ? new Date(data.deadline) : null
        const deadlinePassed = deadline && now > deadline
        
        // Calculate days until expiry
        let daysUntilExpiry = null
        if (expiryDate) {
          daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
        }
        
        return {
          id: doc.id,
          title: data.jobtitle || data.title || "Untitled Job",
          jobtitle: data.jobtitle || data.title || "Untitled Job",
          location: data.location || "Not specified",
          type: data.type || "Full-time",
          salary: data.salary || "Competitive",
          salaryMin: data.salaryMin || null,
          salaryMax: data.salaryMax || null,
          status: isExpired ? "Expired" : data.status === "active" ? "Active" : data.status === "closed" ? "Closed" : data.status || "Active",
          posted: getTimeAgo(data.createdAt?.toDate?.() || new Date(data.postedDate)),
          applicants: Array.isArray(data.applicants) ? data.applicants.length : 0,
          applicantsData: Array.isArray(data.applicants) ? data.applicants : [],
          newApplicants: 0,
          views: data.views || 0,
          filled: data.status === "closed" && data.filled,
          department: data.department || "General",
          companyName: data.companyName || "",
          description: data.description || "",
          responsibilities: data.responsibilities || [],
          requirements: data.requirements || [],
          skills: data.skills || [],
          benefits: data.benefits || "",
          experience: data.experience || "",
          positions: data.positions || 1,
          deadline: data.deadline || null,
          deadlinePassed: deadlinePassed,
          isExpired: isExpired,
          daysUntilExpiry: daysUntilExpiry,
          expiryDate: data.expiryDate || null,
          applicationEmail: data.applicationEmail || "",
          createdAt: data.createdAt?.toDate?.() || new Date(data.postedDate),
        }
      })
      
      // Sort by createdAt descending (newest first) - client side sorting
      fetchedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
      console.log("✅ Fetched jobs from Firestore:", fetchedJobs.length)
      setJobs(fetchedJobs)
    } catch (error) {
      console.error("❌ Error fetching jobs:", error)
      setJobs([])
      toast({
        title: "Error loading jobs",
        description: error.message || "Failed to fetch jobs. Please try again.",
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

  // Load user and fetch jobs on mount
  useEffect(() => {
    const loadJobs = async () => {
      const currentUser = getCurrentUser()
      let uid = currentUser?.uid
      
      if (!uid) {
        // Fallback to localStorage
        uid = localStorage.getItem("userId")
      }
      
      if (uid) {
        setRecruiterId(uid)
        await fetchJobs(uid)
      } else {
        setIsLoading(false)
        toast({
          title: "Not authenticated",
          description: "Please login to view your jobs.",
          variant: "destructive",
        })
      }
    }
    
    loadJobs()
  }, [])

  // Handle job status change (close/reopen)
  const handleStatusChange = async (jobId, newStatus) => {
    setStatusChangingJobId(jobId)
    
    try {
      await updateDoc(doc(db, "jobs", jobId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      
      // Update local state
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: newStatus === "active" ? "Active" : "Closed" }
          : job
      ))
      
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
      setStatusChangingJobId(null)
    }
  }

  // Open delete confirmation dialog
  const openDeleteDialog = (job) => {
    setJobToDelete(job)
    setDeleteReason("")
    setDeleteDialogOpen(true)
  }

  // Handle job deletion
  const handleDeleteJob = async () => {
    if (!jobToDelete) return
    
    setIsDeleting(true)
    
    try {
      await deleteDoc(doc(db, "jobs", jobToDelete.id))
      
      // Update local state
      setJobs(prev => prev.filter(job => job.id !== jobToDelete.id))
      
      toast({
        title: "Job Deleted",
        description: `"${jobToDelete.title}" has been deleted successfully.`,
      })
      
      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setJobToDelete(null)
      setDeleteReason("")
    } catch (error) {
      console.error("Error deleting job:", error)
      toast({
        title: "Error",
        description: "Failed to delete job. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle job duplication
  const handleDuplicateJob = (job) => {
    // Store job data in localStorage for the new job page to pick up
    localStorage.setItem("duplicateJob", JSON.stringify(job))
    toast({
      title: "Duplicating Job",
      description: "Redirecting to create a copy of this job...",
    })
    window.location.href = "/recruiter/jobs/new?duplicate=true"
  }

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "Closed":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "Expired":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const activeJobs = filteredJobs.filter((job) => job.status === "Active" && !job.isExpired)
  const closedJobs = filteredJobs.filter((job) => job.status === "Closed" || job.status === "Expired")

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading your jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Management</h1>
          <p className="mt-2 text-muted-foreground">Create and manage your job postings</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => recruiterId && fetchJobs(recruiterId)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/recruiter/jobs/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Post New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Active Jobs</p>
              <p className="text-3xl font-bold text-foreground">{activeJobs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Closed Jobs</p>
              <p className="text-3xl font-bold text-foreground">{closedJobs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Applicants</p>
              <p className="text-3xl font-bold text-foreground">{jobs.reduce((sum, job) => sum + job.applicants, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="text-3xl font-bold text-foreground">{jobs.reduce((sum, job) => sum + job.views, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, location, or department..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active ({activeJobs.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({closedJobs.length})</TabsTrigger>
          <TabsTrigger value="all">All Jobs ({filteredJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Briefcase className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No active jobs</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  {searchQuery 
                    ? "No jobs match your search criteria." 
                    : "You haven't posted any jobs yet. Create your first job posting!"}
                </p>
                {!searchQuery && (
                  <Link href="/recruiter/jobs/new" className="mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Post New Job
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            activeJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/recruiter/jobs/${job.id}`}>
                            <h3 className="text-lg font-semibold text-foreground hover:text-primary">{job.title}</h3>
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-primary">AED</span>
                              {job.salary}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.posted}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Applicants</p>
                          <p className="text-lg font-semibold text-foreground">
                            {job.applicants}
                            {job.newApplicants > 0 && (
                              <span className="ml-1 text-sm text-blue-600">(+{job.newApplicants})</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold text-foreground">{job.views}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="text-lg font-semibold text-foreground capitalize">{job.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/recruiter/jobs/${job.id}`}>
                        <Button variant="outline" className="w-full bg-transparent" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/recruiter/candidates?job=${job.id}`}>
                        <Button variant="outline" className="w-full bg-transparent" size="sm">
                          <Users className="mr-2 h-4 w-4" />
                          View Applicants
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full bg-transparent" size="sm">
                            <MoreVertical className="mr-2 h-4 w-4" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicateJob(job)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate Job
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(job.id, "closed")}
                            disabled={statusChangingJobId === job.id}
                          >
                            {statusChangingJobId === job.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Archive className="mr-2 h-4 w-4" />
                            )}
                            {statusChangingJobId === job.id ? "Closing..." : "Close Job"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => openDeleteDialog(job)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="closed" className="space-y-4">
          {closedJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Archive className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No closed jobs</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  You don't have any closed job postings.
                </p>
              </CardContent>
            </Card>
          ) : (
            closedJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/recruiter/jobs/${job.id}`}>
                            <h3 className="text-lg font-semibold text-foreground hover:text-primary">{job.title}</h3>
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-primary">AED</span>
                              {job.salary}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.posted}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Applicants</p>
                          <p className="text-lg font-semibold text-foreground">{job.applicants}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold text-foreground">{job.views}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="text-lg font-semibold text-foreground capitalize">{job.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/recruiter/jobs/${job.id}`}>
                        <Button variant="outline" className="w-full bg-transparent" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="w-full bg-transparent" 
                        size="sm"
                        onClick={() => handleStatusChange(job.id, "active")}
                        disabled={statusChangingJobId === job.id}
                      >
                        {statusChangingJobId === job.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Reposting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Repost
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full bg-transparent text-destructive hover:text-destructive" 
                        size="sm"
                        onClick={() => openDeleteDialog(job)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Briefcase className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No jobs found</h3>
                <p className="mt-2 text-center text-muted-foreground">
                  {searchQuery 
                    ? "No jobs match your search criteria." 
                    : "You haven't posted any jobs yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link href={`/recruiter/jobs/${job.id}`}>
                            <h3 className="text-lg font-semibold text-foreground hover:text-primary">{job.title}</h3>
                          </Link>
                          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <span className="text-xs font-semibold text-primary">AED</span>
                              {job.salary}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {job.posted}
                            </span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Applicants</p>
                          <p className="text-lg font-semibold text-foreground">{job.applicants}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Views</p>
                          <p className="text-lg font-semibold text-foreground">{job.views}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <p className="text-lg font-semibold text-foreground capitalize">{job.type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link href={`/recruiter/jobs/${job.id}`}>
                        <Button variant="outline" className="w-full bg-transparent" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/recruiter/candidates?job=${job.id}`}>
                        <Button variant="outline" className="w-full bg-transparent" size="sm">
                          <Users className="mr-2 h-4 w-4" />
                          View Applicants
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="w-full bg-transparent text-destructive hover:text-destructive" 
                        size="sm"
                        onClick={() => openDeleteDialog(job)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Job</DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {jobToDelete && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">You are about to delete:</p>
                <p className="mt-1 font-semibold text-foreground">{jobToDelete.title}</p>
                <p className="text-sm text-muted-foreground">
                  {jobToDelete.location} • {jobToDelete.applicants} applicants
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deleteReason">Why are you deleting this job? (Optional)</Label>
                <Textarea
                  id="deleteReason"
                  placeholder="e.g., Position filled, No longer hiring, Posted by mistake..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 ">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteJob}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
