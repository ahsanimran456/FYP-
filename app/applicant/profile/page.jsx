"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Upload, Plus, X, Save, User, Briefcase, GraduationCap, Award, LinkIcon, FileText, Loader2, Heart, Trash2, Camera, File, CheckCircle2 } from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { uploadAvatar, uploadResume } from "@/lib/supabase"
import Link from "next/link"

export default function ProfilePage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState("")
  const [savedJobs, setSavedJobs] = useState([])
  const [savedJobsData, setSavedJobsData] = useState([])
  
  // File upload states
  const [avatarUrl, setAvatarUrl] = useState("")
  const [resumeUrl, setResumeUrl] = useState("")
  const [resumeName, setResumeName] = useState("")
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    professionalTitle: "",
    bio: "",
    linkedIn: "",
    github: "",
    portfolio: "",
    experienceLevel: "",
    expectedSalaryMin: "",
    expectedSalaryMax: "",
    willingToRelocate: "no",
    noticePeriod: "2weeks",
    preferredJobTypes: [],
  })

  // Experience entries
  const [experiences, setExperiences] = useState([])
  const [education, setEducation] = useState([])

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        const userId = localStorage.getItem("userId")
        
        if (!userId) {
          setIsLoading(false)
          return
        }

        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const data = userDoc.data()
          const nameParts = (data.name || "").split(" ")
          
          setFormData({
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: data.email || "",
            phone: data.phone || "",
            location: data.location || "",
            professionalTitle: data.professionalTitle || "",
            bio: data.bio || "",
            linkedIn: data.linkedIn || "",
            github: data.github || "",
            portfolio: data.portfolio || "",
            experienceLevel: data.experienceLevel || "",
            expectedSalaryMin: data.expectedSalaryMin?.toString() || "",
            expectedSalaryMax: data.expectedSalaryMax?.toString() || "",
            willingToRelocate: data.willingToRelocate || "no",
            noticePeriod: data.noticePeriod || "2weeks",
            preferredJobTypes: data.preferredJobTypes || [],
          })
          
          setSkills(data.skills || [])
          setExperiences(data.experiences || [])
          setEducation(data.education || [])
          setSavedJobs(data.savedJobs || [])
          setAvatarUrl(data.avatarUrl || "")
          setResumeUrl(data.resumeUrl || "")
          setResumeName(data.resumeName || "")
          
          // Fetch saved jobs data
          if (data.savedJobs && data.savedJobs.length > 0) {
            const jobsData = []
            for (const jobId of data.savedJobs.slice(0, 10)) {
              const jobDoc = await getDoc(doc(db, "jobs", jobId))
              if (jobDoc.exists()) {
                const job = jobDoc.data()
                jobsData.push({
                  id: jobDoc.id,
                  title: job.jobtitle || job.title || "Untitled Job",
                  company: job.companyName || "Company",
                  location: job.location || "Not specified",
                  salary: job.salary || "Competitive",
                  status: job.status,
                })
              }
            }
            setSavedJobsData(jobsData)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Handle avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) throw new Error("User not logged in")

      const url = await uploadAvatar(userId, file)
      setAvatarUrl(url)

      // Save to Firebase immediately
      await updateDoc(doc(db, "users", userId), {
        avatarUrl: url,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "✅ Photo uploaded!",
        description: "Your profile picture has been updated.",
      })
    } catch (error) {
      console.error("Avatar upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  // Handle resume upload
  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingResume(true)
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) throw new Error("User not logged in")

      const url = await uploadResume(userId, file)
      setResumeUrl(url)
      setResumeName(file.name)

      // Save to Firebase immediately
      await updateDoc(doc(db, "users", userId), {
        resumeUrl: url,
        resumeName: file.name,
        updatedAt: serverTimestamp(),
      })

      toast({
        title: "✅ Resume uploaded!",
        description: "Your CV has been saved successfully.",
      })
    } catch (error) {
      console.error("Resume upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload resume.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingResume(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const userId = localStorage.getItem("userId")
      if (!userId) {
        throw new Error("User not logged in")
      }

      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        location: formData.location,
        professionalTitle: formData.professionalTitle,
        bio: formData.bio,
        linkedIn: formData.linkedIn,
        github: formData.github,
        portfolio: formData.portfolio,
        experienceLevel: formData.experienceLevel,
        expectedSalaryMin: formData.expectedSalaryMin ? parseInt(formData.expectedSalaryMin) : null,
        expectedSalaryMax: formData.expectedSalaryMax ? parseInt(formData.expectedSalaryMax) : null,
        willingToRelocate: formData.willingToRelocate,
        noticePeriod: formData.noticePeriod,
        preferredJobTypes: formData.preferredJobTypes,
        skills: skills,
        experiences: experiences,
        education: education,
        avatarUrl: avatarUrl,
        resumeUrl: resumeUrl,
        resumeName: resumeName,
        updatedAt: serverTimestamp(),
      }

      await updateDoc(doc(db, "users", userId), updateData)
      
      // Update localStorage
      localStorage.setItem("userName", updateData.name)

      toast({
        title: "✅ Profile Updated",
        description: "Your changes have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Failed to save",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
  }

  const toggleJobType = (type) => {
    const current = formData.preferredJobTypes || []
    if (current.includes(type)) {
      setFormData({ ...formData, preferredJobTypes: current.filter(t => t !== type) })
    } else {
      setFormData({ ...formData, preferredJobTypes: [...current, type] })
    }
  }

  const addExperience = () => {
    setExperiences([
      ...experiences,
      {
        id: Date.now(),
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        current: false,
        description: "",
      },
    ])
  }

  const updateExperience = (index, field, value) => {
    const updated = [...experiences]
    updated[index] = { ...updated[index], [field]: value }
    setExperiences(updated)
  }

  const removeExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index))
  }

  const addEducation = () => {
    setEducation([
      ...education,
      {
        id: Date.now(),
        degree: "",
        field: "",
        school: "",
        startDate: "",
        endDate: "",
        gpa: "",
        description: "",
      },
    ])
  }

  const updateEducation = (index, field, value) => {
    const updated = [...education]
    updated[index] = { ...updated[index], [field]: value }
    setEducation(updated)
  }

  const removeEducation = (index) => {
    setEducation(education.filter((_, i) => i !== index))
  }

  const removeSavedJob = async (jobId) => {
    try {
      const userId = localStorage.getItem("userId")
      const newSavedJobs = savedJobs.filter(id => id !== jobId)
      
      await updateDoc(doc(db, "users", userId), {
        savedJobs: newSavedJobs,
      })
      
      setSavedJobs(newSavedJobs)
      setSavedJobsData(savedJobsData.filter(job => job.id !== jobId))
      
      toast({
        title: "Job removed",
        description: "Job removed from saved list.",
      })
    } catch (error) {
      console.error("Error removing saved job:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your personal information and preferences</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">
            <User className="mr-2 h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Briefcase className="mr-2 h-4 w-4" />
            Experience
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="mr-2 h-4 w-4" />
            Education
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Award className="mr-2 h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Heart className="mr-2 h-4 w-4" />
            Saved Jobs
          </TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Upload a professional photo</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || "/placeholder.svg?height=96&width=96"} />
                  <AvatarFallback className="text-2xl">
                    {formData.firstName?.charAt(0)}{formData.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                {avatarUrl && !isUploadingAvatar && (
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-1">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={isUploadingAvatar}
                  />
                  <Button variant="outline" disabled={isUploadingAvatar}>
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        {avatarUrl ? "Change Photo" : "Upload Photo"}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, GIF, WebP • Max 5MB
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  placeholder="San Francisco, CA"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Professional Title</Label>
                <Input 
                  id="title" 
                  placeholder="Senior Software Engineer"
                  value={formData.professionalTitle}
                  onChange={(e) => handleChange("professionalTitle", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <Select value={formData.experienceLevel} onValueChange={(value) => handleChange("experienceLevel", value)}>
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
              <div className="space-y-2">
                <Label htmlFor="bio">Professional Summary</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell employers about yourself..."
                  rows={5}
                  value={formData.bio}
                  onChange={(e) => handleChange("bio", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Brief description for your profile (max 500 characters)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
              <CardDescription>Add your professional links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="linkedin" 
                    placeholder="https://linkedin.com/in/username" 
                    className="pl-9"
                    value={formData.linkedIn}
                    onChange={(e) => handleChange("linkedIn", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub Profile</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="github" 
                    placeholder="https://github.com/username" 
                    className="pl-9"
                    value={formData.github}
                    onChange={(e) => handleChange("github", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio Website</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="portfolio" 
                    placeholder="https://yourportfolio.com" 
                    className="pl-9"
                    value={formData.portfolio}
                    onChange={(e) => handleChange("portfolio", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume / CV</CardTitle>
              <CardDescription>Upload your latest resume to share with employers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeUrl ? (
                <div className="flex items-center gap-4 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{resumeName || "Resume"}</p>
                    <p className="text-sm text-muted-foreground">Uploaded successfully</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </a>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleResumeUpload}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        disabled={isUploadingResume}
                      />
                      <Button variant="outline" size="sm" disabled={isUploadingResume}>
                        {isUploadingResume ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Replace"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={isUploadingResume}
                  />
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 transition-colors hover:border-primary hover:bg-primary/5">
                    {isUploadingResume ? (
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
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, DOC, DOCX • Max size: 10MB
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Experience */}
        <TabsContent value="experience" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Work Experience</CardTitle>
                  <CardDescription>Add your professional experience</CardDescription>
                </div>
                <Button onClick={addExperience}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Experience
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {experiences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No experience added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addExperience}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Experience
                  </Button>
                </div>
              ) : (
                experiences.map((exp, index) => (
                  <div key={exp.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input 
                              placeholder="Senior Frontend Developer"
                              value={exp.title}
                              onChange={(e) => updateExperience(index, "title", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company</Label>
                            <Input 
                              placeholder="Company Name"
                              value={exp.company}
                              onChange={(e) => updateExperience(index, "company", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input 
                              type="month"
                              value={exp.startDate}
                              onChange={(e) => updateExperience(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input 
                              type="month" 
                              placeholder="Present"
                              value={exp.endDate}
                              onChange={(e) => updateExperience(index, "endDate", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input 
                            placeholder="San Francisco, CA"
                            value={exp.location}
                            onChange={(e) => updateExperience(index, "location", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Describe your responsibilities and achievements..."
                            rows={4}
                            value={exp.description}
                            onChange={(e) => updateExperience(index, "description", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeExperience(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education */}
        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Education</CardTitle>
                  <CardDescription>Add your educational background</CardDescription>
                </div>
                <Button onClick={addEducation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Education
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {education.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No education added yet</p>
                  <Button variant="outline" className="mt-4" onClick={addEducation}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your Education
                  </Button>
                </div>
              ) : (
                education.map((edu, index) => (
                  <div key={edu.id} className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Degree</Label>
                            <Input 
                              placeholder="Bachelor of Science"
                              value={edu.degree}
                              onChange={(e) => updateEducation(index, "degree", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Field of Study</Label>
                            <Input 
                              placeholder="Computer Science"
                              value={edu.field}
                              onChange={(e) => updateEducation(index, "field", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>School/University</Label>
                          <Input 
                            placeholder="University Name"
                            value={edu.school}
                            onChange={(e) => updateEducation(index, "school", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input 
                              type="month"
                              value={edu.startDate}
                              onChange={(e) => updateEducation(index, "startDate", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input 
                              type="month"
                              value={edu.endDate}
                              onChange={(e) => updateEducation(index, "endDate", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>GPA (Optional)</Label>
                          <Input 
                            placeholder="3.8"
                            value={edu.gpa}
                            onChange={(e) => updateEducation(index, "gpa", e.target.value)}
                          />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeEducation(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills & Preferences */}
        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your technical and soft skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pl-3 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 rounded-sm hover:bg-muted">
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
                <Button onClick={addSkill}>Add</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Preferences</CardTitle>
              <CardDescription>Set your job search preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Job Types</Label>
                <div className="flex flex-wrap gap-2">
                  {["Full-time", "Part-time", "Contract", "Remote", "Freelance"].map((type) => (
                    <Badge 
                      key={type} 
                      variant={formData.preferredJobTypes?.includes(type) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleJobType(type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expected Salary - Min (Monthly AED)</Label>
                  <Input 
                    type="number" 
                    placeholder="8000"
                    value={formData.expectedSalaryMin}
                    onChange={(e) => handleChange("expectedSalaryMin", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Salary - Max (Monthly AED)</Label>
                  <Input 
                    type="number" 
                    placeholder="15000"
                    value={formData.expectedSalaryMax}
                    onChange={(e) => handleChange("expectedSalaryMax", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Willing to Relocate</Label>
                <Select value={formData.willingToRelocate} onValueChange={(value) => handleChange("willingToRelocate", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="maybe">Open to discussion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notice Period</Label>
                <Select value={formData.noticePeriod} onValueChange={(value) => handleChange("noticePeriod", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="1week">1 week</SelectItem>
                    <SelectItem value="2weeks">2 weeks</SelectItem>
                    <SelectItem value="1month">1 month</SelectItem>
                    <SelectItem value="2months">2 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Saved Jobs */}
        <TabsContent value="saved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved Jobs</CardTitle>
              <CardDescription>Jobs you've saved for later</CardDescription>
            </CardHeader>
            <CardContent>
              {savedJobsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2">No saved jobs yet</p>
                  <Link href="/applicant/jobs">
                    <Button variant="outline" className="mt-4">
                      Browse Jobs
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedJobsData.map((job) => (
                    <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <Link href={`/applicant/jobs/${job.id}`}>
                          <h4 className="font-medium hover:text-primary">{job.title}</h4>
                        </Link>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="outline" className="text-xs">{job.location}</Badge>
                          <Badge variant="outline" className="text-xs">{job.salary}</Badge>
                          {job.status !== "active" && (
                            <Badge variant="destructive" className="text-xs">Closed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {job.status === "active" && (
                          <Link href={`/applicant/jobs/${job.id}/apply`}>
                            <Button size="sm">Apply</Button>
                          </Link>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeSavedJob(job.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
