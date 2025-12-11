"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Building2, Mail, Lock, User, Loader2, Briefcase, Users, Eye, EyeOff, Phone, Globe, Building, BadgeCheck, MapPin, Linkedin, Github, FileText, Award, X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { signupSchema } from "@/lib/validation"
import { signUpWithEmail, signInWithGoogle, updateUserData } from "@/lib/auth"

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState(null)
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState("")

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "applicant",
      // Recruiter fields
      companyName: "",
      companyWebsite: "",
      phone: "",
      jobTitle: "",
      companySize: "",
      industry: "",
      // Applicant fields
      professionalTitle: "",
      experienceLevel: "",
      location: "",
      linkedIn: "",
      portfolio: "",
      github: "",
      skills: [],
      bio: "",
    },
  })

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updatedSkills = [...skills, newSkill.trim()]
      setSkills(updatedSkills)
      form.setValue("skills", updatedSkills)
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove) => {
    const updatedSkills = skills.filter((skill) => skill !== skillToRemove)
    setSkills(updatedSkills)
    form.setValue("skills", updatedSkills)
  }

  // Load saved role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem("selectedRole")
    if (savedRole && (savedRole === "recruiter" || savedRole === "applicant")) {
      setSelectedRole(savedRole)
      form.setValue("role", savedRole)
    }
  }, [form])

  const handleRoleSelect = (role) => {
    // Save role to state
    setSelectedRole(role)
    form.setValue("role", role)
    
    // Save role to localStorage for persistence
    localStorage.setItem("selectedRole", role)
    
    // Move to step 2
    setStep(2)
    
    toast({
      title: `Selected: ${role === "recruiter" ? "Recruiter" : "Job Seeker"}`,
      description: "Complete the form below to create your account.",
    })
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      console.log("📝 Submitting signup form:", {
        name: data.name,
        email: data.email,
        role: data.role,
        companyName: data.companyName,
      })
      
      // Create user in Firebase Authentication and Firestore
      const user = await signUpWithEmail(data)
      
      console.log("✅ User successfully registered:", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      })
      
      // Store user info in localStorage for session management
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userName", data.name)
      localStorage.setItem("userRole", data.role)
      localStorage.setItem("userId", user.uid)
      
      // Store recruiter-specific data
      if (data.role === "recruiter" && data.companyName) {
        localStorage.setItem("companyName", data.companyName)
      }
      
      // Clear the temporary selected role
      localStorage.removeItem("selectedRole")

      toast({
        title: "🎉 Account created successfully!",
        description: `Welcome to TalentHub, ${data.name}! Redirecting to your dashboard...`,
      })

      // Redirect based on role
      setTimeout(() => {
        if (data.role === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1500)
    } catch (error) {
      console.error("❌ Signup error:", error)
      
      const errorMessage = error?.message || "An error occurred. Please try again."
      
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignup = async (role) => {
    setIsGoogleLoading(true)
    
    try {
      const { user, userData, isNewUser } = await signInWithGoogle(role)
      
      console.log("✅ Google signup successful:", {
        uid: user.uid,
        email: user.email,
        role: userData?.role,
        isNewUser,
      })

      // If this is a new user and they selected recruiter role, update with role-specific data
      if (isNewUser && role === "recruiter") {
        const formData = form.getValues()
        if (formData.companyName) {
          await updateUserData(user.uid, {
            companyName: formData.companyName,
            companyWebsite: formData.companyWebsite || "",
            jobTitle: formData.jobTitle || "",
            companySize: formData.companySize || "",
            industry: formData.industry || "",
            phone: formData.phone || "",
          })
        }
      }

      // Store user info in localStorage for session management
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", user.email || "")
      localStorage.setItem("userId", user.uid)
      localStorage.setItem("userName", userData?.name || user.displayName || "")
      localStorage.setItem("userRole", userData?.role || role || "applicant")
      
      if (userData?.companyName) {
        localStorage.setItem("companyName", userData.companyName)
      }
      
      // Clear the temporary selected role
      localStorage.removeItem("selectedRole")

      const userRole = userData?.role || role || "applicant"

      toast({
        title: isNewUser ? "🎉 Account created successfully!" : "Welcome back!",
        description: isNewUser 
          ? `Welcome to TalentHub! Redirecting to your dashboard...`
          : "Signed in with Google successfully. Redirecting...",
      })

      // Redirect based on role
      setTimeout(() => {
        if (userRole === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1500)
      
    } catch (error) {
      console.error("❌ Google signup error:", error)
      
      toast({
        title: "Google signup failed",
        description: error.message || "Failed to sign up with Google. Please try again.",
        variant: "destructive",
      })
      
      setIsGoogleLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
    // Clear selected role from localStorage when going back
    localStorage.removeItem("selectedRole")
    setSelectedRole(null)
  }

  const watchedRole = form.watch("role")
  const isRecruiter = watchedRole === "recruiter"

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-12">
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tl from-accent/20 to-transparent blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">TalentHub</span>
          </Link>
        </div>

        {step === 1 ? (
          <Card className="shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Choose your role</CardTitle>
              <CardDescription>Select how you want to use TalentHub</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => handleRoleSelect("applicant")}
                className="group relative w-full overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-card to-accent/5 p-6 text-left shadow-md transition-all hover:scale-[1.02] hover:border-accent hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 shadow-lg transition-transform group-hover:scale-110">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">I&apos;m a Job Seeker</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Looking for opportunities and want to apply for jobs
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect("recruiter")}
                className="group relative w-full overflow-hidden rounded-xl border-2 border-border bg-gradient-to-br from-card to-primary/5 p-6 text-left shadow-md transition-all hover:scale-[1.02] hover:border-primary hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-transform group-hover:scale-110">
                    <Briefcase className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">I&apos;m a Recruiter</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Hiring talent and want to post job openings
                    </p>
                  </div>
                </div>
              </button>

              {/* Quick Google Sign Up Options */}
              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Quick signup with Google</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-col h-auto py-3 bg-transparent hover:bg-accent/10 hover:border-accent"
                  onClick={() => handleGoogleSignup("applicant")}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5 mb-1" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span className="text-xs">Job Seeker</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-col h-auto py-3 bg-transparent hover:bg-primary/10 hover:border-primary"
                  onClick={() => handleGoogleSignup("recruiter")}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5 mb-1" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span className="text-xs">Recruiter</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-center text-sm text-muted-foreground w-full">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isRecruiter ? 'bg-primary/10' : 'bg-accent/10'}`}>
                  {isRecruiter ? (
                    <Briefcase className={`h-4 w-4 ${isRecruiter ? 'text-primary' : 'text-accent'}`} />
                  ) : (
                    <Users className={`h-4 w-4 ${isRecruiter ? 'text-primary' : 'text-accent'}`} />
                  )}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {isRecruiter ? "Recruiter Account" : "Job Seeker Account"}
                </span>
              </div>
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>
                {isRecruiter ? "Set up your recruiter profile to start hiring" : "Start your job search journey"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Basic Information */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="John Doe"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-9 pr-9"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">
                          Must be at least 8 characters with uppercase, lowercase, number, and special character
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone field for all users */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number {isRecruiter ? "" : "(Optional)"}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Applicant-specific fields */}
                  {!isRecruiter && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Professional Information (Optional)</span>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="professionalTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Professional Title</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="e.g. Frontend Developer"
                                  className="pl-9"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="experienceLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Experience Level</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="entry">Entry Level (0-2 yrs)</SelectItem>
                                  <SelectItem value="mid">Mid-Level (2-5 yrs)</SelectItem>
                                  <SelectItem value="senior">Senior (5-8 yrs)</SelectItem>
                                  <SelectItem value="lead">Lead (8+ yrs)</SelectItem>
                                  <SelectItem value="executive">Executive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    placeholder="City, Country"
                                    className="pl-9"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Skills */}
                      <div className="space-y-2">
                        <FormLabel>Skills</FormLabel>
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {skills.map((skill) => (
                              <Badge key={skill} variant="secondary" className="gap-1 pl-3 pr-1">
                                {skill}
                                <button type="button" onClick={() => removeSkill(skill)} className="ml-1 rounded-sm hover:bg-muted">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a skill (e.g. React, Python)"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addSkill()
                              }
                            }}
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addSkill}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-2" />
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">Social Links (Optional)</span>
                      </div>

                      <FormField
                        control={form.control}
                        name="linkedIn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LinkedIn Profile</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="url"
                                  placeholder="https://linkedin.com/in/username"
                                  className="pl-9"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="portfolio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Portfolio</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="url"
                                    placeholder="https://yoursite.com"
                                    className="pl-9"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="github"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GitHub</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="url"
                                    placeholder="https://github.com/user"
                                    className="pl-9"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {/* Recruiter-specific fields */}
                  {isRecruiter && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Company Information</span>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="Acme Corporation"
                                  className="pl-9"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Job Title (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <BadgeCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="text"
                                  placeholder="HR Manager"
                                  className="pl-9"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="companyWebsite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Website (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="url"
                                  placeholder="https://www.example.com"
                                  className="pl-9"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companySize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Size</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1-10">1-10 employees</SelectItem>
                                  <SelectItem value="11-50">11-50 employees</SelectItem>
                                  <SelectItem value="51-200">51-200 employees</SelectItem>
                                  <SelectItem value="201-500">201-500 employees</SelectItem>
                                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                                  <SelectItem value="1000+">1000+ employees</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select industry" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="technology">Technology</SelectItem>
                                  <SelectItem value="finance">Finance</SelectItem>
                                  <SelectItem value="healthcare">Healthcare</SelectItem>
                                  <SelectItem value="education">Education</SelectItem>
                                  <SelectItem value="retail">Retail</SelectItem>
                                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                  <SelectItem value="consulting">Consulting</SelectItem>
                                  <SelectItem value="marketing">Marketing</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Create {isRecruiter ? "Recruiter" : ""} Account
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => handleGoogleSignup(watchedRole)}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing up with Google...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              <div className="flex justify-center">
                <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
                  ← Back to role selection
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-center text-sm text-muted-foreground w-full">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
