"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Plus, AlertCircle, Copy, Sparkles, Wand2, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCurrentUser, getUserData } from "@/lib/auth"
import { generateText } from "@/lib/openai"

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState("")
  const [userData, setUserData] = useState(null)
  const [error, setError] = useState(null)
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [duplicateJobTitle, setDuplicateJobTitle] = useState("")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiUsedForJob, setAiUsedForJob] = useState(false)

  // Calculate default deadline (2 weeks from now)
  const getDefaultDeadline = () => {
    const date = new Date()
    date.setDate(date.getDate() + 14)
    return date.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    title: "",
    department: "",
    type: "",
    location: "",
    experience: "",
    salaryMin: "",
    salaryMax: "",
    benefits: "",
    description: "",
    responsibilities: "",
    requirements: "",
    positions: "1",
    deadline: getDefaultDeadline(), // Auto-fill 2 weeks from now
    applicationEmail: "",
  })

  // Check if basic information is complete
  const isBasicInfoComplete = 
    formData.title.trim() !== "" &&
    formData.type !== "" &&
    formData.location.trim() !== "" &&
    formData.experience !== ""

  // Generate unique job identifier for AI tracking
  const getJobIdentifier = () => {
    return `${formData.title}_${formData.type}_${formData.location}_${formData.experience}`.toLowerCase().replace(/\s+/g, '_')
  }

  // Check if AI was already used for this job configuration
  const checkAIUsage = () => {
    const jobId = getJobIdentifier()
    const usedJobs = JSON.parse(localStorage.getItem("ai_used_jobs") || "[]")
    return usedJobs.includes(jobId)
  }

  // Mark AI as used for this job
  const markAIAsUsed = () => {
    const jobId = getJobIdentifier()
    const usedJobs = JSON.parse(localStorage.getItem("ai_used_jobs") || "[]")
    if (!usedJobs.includes(jobId)) {
      usedJobs.push(jobId)
      localStorage.setItem("ai_used_jobs", JSON.stringify(usedJobs))
    }
    setAiUsedForJob(true)
  }

  // Generate job content using AI (optimized for low tokens)
  const generateWithAI = async () => {
    if (!isBasicInfoComplete) {
      toast({
        title: "Missing Information",
        description: "Please fill in all basic information fields first.",
        variant: "destructive",
      })
      return
    }

    // Check if AI already used for this job
    if (checkAIUsage() || aiUsedForJob) {
      toast({
        title: "AI Already Used",
        description: "AI screening can only be used once per job. Edit the content manually if needed.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingAI(true)

    try {
      const expMap = { entry: "0-2yr", mid: "2-5yr", senior: "5-8yr", lead: "8+yr", executive: "Exec" }
      
      // UAE salary ranges by experience (monthly AED)
      const salaryGuide = {
        entry: "3000-6000",
        mid: "6000-12000", 
        senior: "12000-20000",
        lead: "18000-30000",
        executive: "25000-50000"
      }
      
      // Optimized prompt - minimal tokens, maximum output
      const prompt = `Job: ${formData.title}|${formData.type}|${formData.location}|${expMap[formData.experience] || formData.experience}|${userData?.companyName || "Company"}

Generate concise job posting. Use EXACT format:

---DESC---
[2 short paragraphs about role]

---RESP---
[6 bullet responsibilities]

---REQ---
[6 bullet requirements]

---SKILLS---
[6 skills, comma-separated]

---BENEFITS---
[5 benefits, one per line]

---SALARY---
[ONLY two numbers: minAED,maxAED] UAE monthly salary. Guide for ${formData.experience}: AED ${salaryGuide[formData.experience] || "5000-15000"}. Example format: 8000,15000`

      toast({
        title: "🤖 AI generating...",
        description: "Creating optimized job posting...",
      })

      const response = await generateText(prompt)

      // Parse response efficiently
      const extract = (pattern) => {
        const match = response.match(pattern)
        return match ? match[1].trim() : ""
      }

      const description = extract(/---DESC---\s*([\s\S]*?)(?=---RESP---|$)/i)
      const responsibilities = extract(/---RESP---\s*([\s\S]*?)(?=---REQ---|$)/i)
      const requirements = extract(/---REQ---\s*([\s\S]*?)(?=---SKILLS---|$)/i)
      const skillsText = extract(/---SKILLS---\s*([\s\S]*?)(?=---BENEFITS---|$)/i)
      const benefits = extract(/---BENEFITS---\s*([\s\S]*?)(?=---SALARY---|$)/i)
      const salaryText = extract(/---SALARY---\s*([\s\S]*?)$/i)

      // Parse skills
      const parsedSkills = skillsText.split(",").map(s => s.trim()).filter(s => s.length > 0)

      // Parse salary suggestion with multiple format support
      let salaryMin = ""
      let salaryMax = ""
      
      // Try different patterns to extract salary numbers
      const salaryPatterns = [
        /(\d{4,6})[,\s\-to]+(\d{4,6})/i,  // 8000,15000 or 8000-15000 or 8000 to 15000
        /min[:\s]*(\d+).*max[:\s]*(\d+)/i, // min: 8000, max: 15000
        /(\d+)[^\d]+(\d+)/,                 // Any two numbers
      ]
      
      for (const pattern of salaryPatterns) {
        const match = salaryText.match(pattern)
        if (match) {
          const num1 = parseInt(match[1])
          const num2 = parseInt(match[2])
          // Ensure min < max and values are reasonable (1000 - 100000 AED)
          if (num1 >= 1000 && num2 >= 1000 && num1 <= 100000 && num2 <= 100000) {
            salaryMin = Math.min(num1, num2).toString()
            salaryMax = Math.max(num1, num2).toString()
            break
          }
        }
      }
      
      // Fallback: Use default salary based on experience if AI didn't provide valid values
      if (!salaryMin || !salaryMax) {
        const defaultSalaries = {
          entry: { min: "3500", max: "6000" },
          mid: { min: "7000", max: "12000" },
          senior: { min: "12000", max: "20000" },
          lead: { min: "18000", max: "28000" },
          executive: { min: "25000", max: "45000" }
        }
        const defaults = defaultSalaries[formData.experience] || { min: "5000", max: "12000" }
        salaryMin = defaults.min
        salaryMax = defaults.max
      }

      // Calculate default deadline (2 weeks from now) if not set
      const twoWeeksFromNowDeadline = new Date()
      twoWeeksFromNowDeadline.setDate(twoWeeksFromNowDeadline.getDate() + 14)
      const defaultDeadline = twoWeeksFromNowDeadline.toISOString().split('T')[0]

      // Update form with generated content including salary and deadline
      setFormData(prev => ({
        ...prev,
        description: description || prev.description,
        responsibilities: responsibilities || prev.responsibilities,
        requirements: requirements || prev.requirements,
        benefits: benefits || prev.benefits,
        salaryMin: salaryMin || prev.salaryMin,
        salaryMax: salaryMax || prev.salaryMax,
        deadline: prev.deadline || defaultDeadline,
      }))

      // Update skills
      if (parsedSkills.length > 0) {
        setSkills(parsedSkills)
      }

      // Mark AI as used for this job
      markAIAsUsed()

      toast({
        title: "✨ Content Generated!",
        description: "AI has filled all fields including salary. Review and edit as needed.",
      })

    } catch (error) {
      console.error("AI Generation Error:", error)
      toast({
        title: "AI Generation Failed",
        description: error.message || "Failed to generate. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Check AI usage when basic info changes
  useEffect(() => {
    if (isBasicInfoComplete) {
      setAiUsedForJob(checkAIUsage())
    }
  }, [formData.title, formData.type, formData.location, formData.experience])

  // Load user data and check for duplicate job on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = getCurrentUser()
        
        if (!currentUser) {
          // Try to get from localStorage as fallback
          const userId = localStorage.getItem("userId")
          const userRole = localStorage.getItem("userRole")
          const companyName = localStorage.getItem("companyName")
          const userEmail = localStorage.getItem("userEmail")
          const userName = localStorage.getItem("userName")
          
          if (!userId || userRole !== "recruiter") {
            setError("Please login as a recruiter to post jobs")
            setIsLoading(false)
            return
          }
          
          // Use localStorage data
          setUserData({
            uid: userId,
            role: userRole,
            companyName: companyName || "",
            email: userEmail || "",
            name: userName || "",
          })
          setFormData(prev => ({
            ...prev,
            applicationEmail: userEmail || "",
          }))
        } else {
          // Get full user data from Firestore
          const data = await getUserData(currentUser.uid)
          
          if (!data || data.role !== "recruiter") {
            setError("Only recruiters can post jobs")
            setIsLoading(false)
            return
          }
          
          setUserData(data)
          setFormData(prev => ({
            ...prev,
            applicationEmail: data.email || "",
          }))
        }
        
        // Check if this is a duplicate job
        const isDuplicateParam = searchParams.get("duplicate")
        if (isDuplicateParam === "true") {
          const duplicateJobData = localStorage.getItem("duplicateJob")
          if (duplicateJobData) {
            try {
              const duplicateJob = JSON.parse(duplicateJobData)
              setIsDuplicate(true)
              setDuplicateJobTitle(duplicateJob.title || duplicateJob.jobtitle || "")
              
              // Pre-fill form with duplicate job data
              setFormData(prev => ({
                ...prev,
                title: `${duplicateJob.title || duplicateJob.jobtitle || ""} (Copy)`,
                department: duplicateJob.department || "",
                type: duplicateJob.type || "",
                location: duplicateJob.location || "",
                experience: duplicateJob.experience || "",
                salaryMin: duplicateJob.salaryMin?.toString() || "",
                salaryMax: duplicateJob.salaryMax?.toString() || "",
                benefits: duplicateJob.benefits || "",
                description: duplicateJob.description || "",
                responsibilities: Array.isArray(duplicateJob.responsibilities) 
                  ? duplicateJob.responsibilities.join("\n") 
                  : duplicateJob.responsibilities || "",
                requirements: Array.isArray(duplicateJob.requirements) 
                  ? duplicateJob.requirements.join("\n") 
                  : duplicateJob.requirements || "",
                positions: duplicateJob.positions?.toString() || "1",
                deadline: duplicateJob.deadline || "",
                applicationEmail: duplicateJob.applicationEmail || prev.applicationEmail || "",
              }))
              
              // Set skills
              if (duplicateJob.skills && Array.isArray(duplicateJob.skills)) {
                setSkills(duplicateJob.skills)
              }
              
              // Clear the duplicate job from localStorage
              localStorage.removeItem("duplicateJob")
              
              toast({
                title: "Job Duplicated",
                description: `Form pre-filled with data from "${duplicateJob.title || duplicateJob.jobtitle}". Make any changes and publish.`,
              })
            } catch (err) {
              console.error("Error parsing duplicate job data:", err)
            }
          }
        }
        
        setIsLoading(false)
      } catch (err) {
        console.error("Error loading user data:", err)
        setError("Failed to load user data. Please try again.")
        setIsLoading(false)
      }
    }
    
    loadUserData()
  }, [searchParams, toast])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!userData) {
      toast({
        title: "Error",
        description: "User data not loaded. Please refresh and try again.",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)

    try {
      // Calculate dates
      const now = new Date()
      
      // Default deadline: 2 weeks from now
      const twoWeeksFromNow = new Date(now)
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)
      const defaultDeadline = twoWeeksFromNow.toISOString().split('T')[0]
      
      // Expiry date: 3 weeks from now (job auto-removes 1 week after deadline)
      const threeWeeksFromNow = new Date(now)
      threeWeeksFromNow.setDate(threeWeeksFromNow.getDate() + 21)
      const expiryDate = threeWeeksFromNow.toISOString()

      // Prepare job data for Firestore
      const jobData = {
        // Basic Information
        jobtitle: formData.title.trim(),
        department: formData.department || "General",
        type: formData.type,
        location: formData.location.trim(),
        experience: formData.experience,
        
        // Compensation
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        salary: formData.salaryMin && formData.salaryMax
          ? `AED ${parseInt(formData.salaryMin).toLocaleString()} - ${parseInt(formData.salaryMax).toLocaleString()}/mo`
          : "Competitive",
        benefits: formData.benefits.trim(),
        
        // Job Description
        description: formData.description.trim(),
        responsibilities: formData.responsibilities.split("\n").filter((r) => r.trim()),
        requirements: formData.requirements.split("\n").filter((r) => r.trim()),
        // Skills
        skills: skills,
        
        // Application Settings
        positions: parseInt(formData.positions) || 1,
        deadline: formData.deadline || defaultDeadline, // Auto-set to 1 week if not provided
        applicationEmail: formData.applicationEmail.trim(),
        
        // Recruiter & Company Information
        recruiterId: userData.uid,
        recruiterName: userData.name || "",
        recruiterEmail: userData.email || "",
        companyId: userData.uid, // Using recruiter's UID as company ID since company is linked to recruiter
        companyName: userData.companyName || "Company",
        
        // Status & Metadata
        status: "active", // active, paused, closed, draft
        applicants: [], // Array to store applicant data
        views: 0,
        
        // Timestamps & Expiry
        postedDate: now.toISOString(),
        expiryDate: expiryDate, // Job expires after 2 weeks
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("📝 Creating job in Firestore:", {
        title: jobData.jobtitle,
        recruiterId: jobData.recruiterId,
        companyName: jobData.companyName,
      })

      // Add job to Firestore "jobs" collection
      const docRef = await addDoc(collection(db, "jobs"), jobData)
      
      console.log("✅ Job created successfully with ID:", docRef.id)

      toast({
        title: "🎉 Job Posted Successfully!",
        description: `"${jobData.jobtitle}" has been published and is now live.`,
      })

      // Redirect to jobs list
      setTimeout(() => {
        router.push("/recruiter/jobs?success=true")
      }, 1000)
      
    } catch (error) {
      console.error("❌ Error creating job:", error)
      
      toast({
        title: "Failed to post job",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
      
      setIsSubmitting(false)
    }
  }

  const addSkill = () => {
    if (newSkill && !skills.includes(newSkill)) {
      setSkills([...skills, newSkill])
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove))
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-semibold">{error}</h2>
            <p className="mt-2 text-muted-foreground">
              Please make sure you're logged in as a recruiter.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/login">
                <Button>Login</Button>
              </Link>
              <Link href="/recruiter/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back Button */}
      <Link href="/recruiter/jobs">
        <Button variant="ghost" size="sm">
          ← Back to Jobs
        </Button>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          {isDuplicate && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Copy className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isDuplicate ? "Duplicate Job" : "Post a New Job"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {isDuplicate 
                ? `Creating a copy of "${duplicateJobTitle}". Update the details and publish.`
                : `Fill in the details to create a new job posting for ${userData?.companyName || "your company"}`
              }
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about the position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Frontend Developer"
                required
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => handleInputChange("department", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="customer-support">Customer Support</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Employment Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleInputChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location (Emirates) *</Label>
                <Select 
                  value={formData.location} 
                  onValueChange={(value) => handleInputChange("location", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select emirate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                    <SelectItem value="Dubai">Dubai</SelectItem>
                    <SelectItem value="Sharjah">Sharjah</SelectItem>
                    <SelectItem value="Ajman">Ajman</SelectItem>
                    <SelectItem value="Umm Al Quwain">Umm Al Quwain</SelectItem>
                    <SelectItem value="Ras Al Khaimah">Ras Al Khaimah</SelectItem>
                    <SelectItem value="Fujairah">Fujairah</SelectItem>
                    <SelectItem value="Remote">Remote (UAE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience Level *</Label>
                <Select 
                  value={formData.experience} 
                  onValueChange={(value) => handleInputChange("experience", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid-Level (2-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (5-8 years)</SelectItem>
                    <SelectItem value="lead">Lead (8+ years)</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Generate Button - Shows when basic info is complete and NOT duplicating */}
        {isBasicInfoComplete && !isDuplicate && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {aiUsedForJob || checkAIUsage() ? "✓ AI Content Generated" : "AI-Powered Job Description"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {aiUsedForJob || checkAIUsage() 
                        ? "AI can only be used once per job. Edit manually if needed."
                        : "Let AI generate description, responsibilities, requirements, skills & salary"
                      }
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={generateWithAI}
                  disabled={isGeneratingAI || aiUsedForJob || checkAIUsage()}
                  className={`min-w-[180px] ${
                    aiUsedForJob || checkAIUsage()
                      ? "bg-green-600 hover:bg-green-600 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  }`}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : aiUsedForJob || checkAIUsage() ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      AI Used
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
            <CardDescription>Salary range and benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary (Monthly AED)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  placeholder="5000"
                  value={formData.salaryMin}
                  onChange={(e) => handleInputChange("salaryMin", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary (Monthly AED)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  placeholder="15000"
                  value={formData.salaryMax}
                  onChange={(e) => handleInputChange("salaryMax", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits</Label>
              <Textarea
                id="benefits"
                placeholder="List benefits (health insurance, 401k, unlimited PTO, etc.)"
                rows={3}
                value={formData.benefits}
                onChange={(e) => handleInputChange("benefits", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>Detailed information about the role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Overview *</Label>
              <Textarea
                id="description"
                placeholder="Provide a brief overview of the position..."
                rows={5}
                required
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Key Responsibilities *</Label>
              <Textarea
                id="responsibilities"
                placeholder="List the main responsibilities (one per line)"
                rows={5}
                required
                value={formData.responsibilities}
                onChange={(e) => handleInputChange("responsibilities", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements *</Label>
              <Textarea
                id="requirements"
                placeholder="List the requirements (one per line)"
                rows={5}
                required
                value={formData.requirements}
                onChange={(e) => handleInputChange("requirements", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
            <CardDescription>Add skills candidates should have</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pl-3 pr-1">
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)} className="ml-1 rounded-sm hover:bg-muted">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addSkill()
                  }
                }}
              />
              <Button type="button" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>Configure how candidates can apply</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="positions">Number of Positions</Label>
                <Input
                  id="positions"
                  type="number"
                  placeholder="1"
                  min="1"
                  value={formData.positions}
                  onChange={(e) => handleInputChange("positions", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange("deadline", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationEmail">Application Email</Label>
              <Input
                id="applicationEmail"
                type="email"
                placeholder="jobs@company.com"
                value={formData.applicationEmail}
                onChange={(e) => handleInputChange("applicationEmail", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Info Preview */}
        {userData && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Job will be posted by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg">
                  {userData.companyName?.charAt(0) || "C"}
                </div>
                <div>
                  <p className="font-medium">{userData.companyName || "Your Company"}</p>
                  <p className="text-sm text-muted-foreground">
                    {userData.name} • {userData.email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Link href="/recruiter/jobs" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    {isDuplicate && <Copy className="mr-2 h-4 w-4" />}
                    {isDuplicate ? "Publish Duplicate" : "Publish Job"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
