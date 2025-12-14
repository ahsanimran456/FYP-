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
import { 
  Building2, Mail, Lock, User, Loader2, Briefcase, Users, Eye, EyeOff, Phone, Globe, Building, 
  BadgeCheck, MapPin, Linkedin, Github, FileText, Award, X, Plus, ArrowRight, ArrowLeft, 
  Sparkles, CheckCircle2, Zap, Target, TrendingUp
} from "lucide-react"
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "applicant",
      companyName: "",
      companyWebsite: "",
      phone: "",
      jobTitle: "",
      companySize: "",
      industry: "",
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

  useEffect(() => {
    const savedRole = localStorage.getItem("selectedRole")
    if (savedRole && (savedRole === "recruiter" || savedRole === "applicant")) {
      setSelectedRole(savedRole)
      form.setValue("role", savedRole)
    }
  }, [form])

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    form.setValue("role", role)
    localStorage.setItem("selectedRole", role)
    setStep(2)
    
    toast({
      title: `Selected: ${role === "recruiter" ? "Recruiter" : "Job Seeker"}`,
      description: "Complete the form below to create your account.",
    })
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const user = await signUpWithEmail(data)
      
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", data.email)
      localStorage.setItem("userName", data.name)
      localStorage.setItem("userRole", data.role)
      localStorage.setItem("userId", user.uid)
      
      if (data.role === "recruiter" && data.companyName) {
        localStorage.setItem("companyName", data.companyName)
      }
      
      localStorage.removeItem("selectedRole")

      toast({
        title: "🎉 Account created successfully!",
        description: `Welcome to TalentHub, ${data.name}! Redirecting to your dashboard...`,
      })

      setTimeout(() => {
        if (data.role === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1500)
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error?.message || "An error occurred. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async (role) => {
    setIsGoogleLoading(true)
    
    try {
      const { user, userData, isNewUser } = await signInWithGoogle(role)
      
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

      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", user.email || "")
      localStorage.setItem("userId", user.uid)
      localStorage.setItem("userName", userData?.name || user.displayName || "")
      localStorage.setItem("userRole", userData?.role || role || "applicant")
      
      if (userData?.companyName) {
        localStorage.setItem("companyName", userData.companyName)
      }
      
      localStorage.removeItem("selectedRole")

      const userRole = userData?.role || role || "applicant"

      toast({
        title: isNewUser ? "🎉 Account created successfully!" : "Welcome back!",
        description: isNewUser 
          ? `Welcome to TalentHub! Redirecting to your dashboard...`
          : "Signed in with Google successfully. Redirecting...",
      })

      setTimeout(() => {
        if (userRole === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1500)
      
    } catch (error) {
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
    localStorage.removeItem("selectedRole")
    setSelectedRole(null)
  }

  const watchedRole = form.watch("role")
  const isRecruiter = watchedRole === "recruiter"

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Left Side - Image */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-accent via-accent/90 to-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 hero-pattern opacity-10"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 right-10 w-32 h-32 border-2 border-white/20 rounded-full animate-float"></div>
        <div className="absolute bottom-32 left-10 w-24 h-24 border-2 border-white/20 rounded-2xl rotate-45 animate-float-slow"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-white/10 rounded-xl animate-bounce-subtle"></div>
        
        <div className="relative z-10 p-12 flex flex-col justify-center max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TalentHub</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Start your
            <span className="block">success journey</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-10">
            Join thousands of professionals and companies finding their perfect match every day.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              { icon: Zap, text: "Get started in under 2 minutes" },
              { icon: Target, text: "AI-powered matching technology" },
              { icon: TrendingUp, text: "Track your career progress" },
              { icon: Sparkles, text: "Free forever for job seekers" },
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <benefit.icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { value: "50K+", label: "Users" },
              { value: "10K+", label: "Jobs" },
              { value: "95%", label: "Success" },
            ].map((stat, index) => (
              <div key={index} className="text-center glass-card rounded-xl p-4 bg-white/10 backdrop-blur-sm border border-white/20">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-white/60 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Background Image Overlay */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80" 
            alt="Team success"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center bg-background p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-slide-in-right">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-foreground">TalentHub</span>
            </Link>
          </div>

          {step === 1 ? (
            /* Step 1: Role Selection */
            <Card className="border-none shadow-2xl shadow-accent/10">
              <CardHeader className="space-y-1 text-center pb-2">
                <CardTitle className="text-2xl font-bold">Join TalentHub</CardTitle>
                <CardDescription>Choose how you want to use the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Role Options */}
                <button
                  onClick={() => handleRoleSelect("applicant")}
                  className="group relative w-full overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-card to-accent/5 p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:border-accent hover:shadow-xl"
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
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect("recruiter")}
                  className="group relative w-full overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-card to-primary/5 p-6 text-left shadow-lg transition-all hover:scale-[1.02] hover:border-primary hover:shadow-xl"
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
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </button>

                {/* Quick Google Sign Up */}
                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Quick signup with Google</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-col h-auto py-4 bg-transparent border-2 hover:bg-muted hover:border-primary/50 transition-all"
                    onClick={() => handleGoogleSignup("applicant")}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5 mb-2" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-xs font-medium">Job Seeker</span>
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-col h-auto py-4 bg-transparent border-2 hover:bg-primary/5 hover:border-primary transition-all"
                    onClick={() => handleGoogleSignup("recruiter")}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5 mb-2" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-xs font-medium">Recruiter</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="text-center text-sm text-muted-foreground w-full">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ) : (
            /* Step 2: Form */
            <Card className="border-none shadow-2xl shadow-accent/10">
              <CardHeader className="space-y-1 pb-2">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isRecruiter ? 'bg-primary/10' : 'bg-accent/10'}`}>
                    {isRecruiter ? (
                      <Briefcase className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">Create your account</CardTitle>
                    <CardDescription className="text-sm">
                      {isRecruiter ? "Set up your recruiter profile" : "Start your job search journey"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Google Sign Up */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 bg-transparent border-2 hover:bg-muted/50 transition-all"
                  onClick={() => handleGoogleSignup(watchedRole)}
                  disabled={isLoading || isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing up with Google...
                    </>
                  ) : (
                    <>
                      <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Or with email</span>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Basic Information */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Full Name *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input type="text" placeholder="John Doe" className="pl-10 h-12 border-2" {...field} />
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
                          <FormLabel className="text-sm font-medium">Email *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input type="email" placeholder="you@example.com" className="pl-10 h-12 border-2" {...field} />
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
                          <FormLabel className="text-sm font-medium">Password *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 pr-10 h-12 border-2"
                                {...field}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            Min 8 chars with uppercase, lowercase, number & special char
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Phone Number {isRecruiter ? "" : "(Optional)"}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                              <Input type="tel" placeholder="+1 (555) 000-0000" className="pl-10 h-12 border-2" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Recruiter-specific fields */}
                    {isRecruiter && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <Building className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">Company Information</span>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Company Name *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                  <Input type="text" placeholder="Acme Corporation" className="pl-10 h-12 border-2" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="companySize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Company Size</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2">
                                      <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="1-10">1-10</SelectItem>
                                    <SelectItem value="11-50">11-50</SelectItem>
                                    <SelectItem value="51-200">51-200</SelectItem>
                                    <SelectItem value="201-500">201-500</SelectItem>
                                    <SelectItem value="501-1000">501-1000</SelectItem>
                                    <SelectItem value="1000+">1000+</SelectItem>
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
                                <FormLabel className="text-sm font-medium">Industry</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="technology">Technology</SelectItem>
                                    <SelectItem value="finance">Finance</SelectItem>
                                    <SelectItem value="healthcare">Healthcare</SelectItem>
                                    <SelectItem value="education">Education</SelectItem>
                                    <SelectItem value="retail">Retail</SelectItem>
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

                    {/* Applicant-specific fields */}
                    {!isRecruiter && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <Award className="h-4 w-4 text-accent" />
                          <span className="text-sm font-semibold text-accent">Professional Info (Optional)</span>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="professionalTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Professional Title</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                  <Input type="text" placeholder="e.g. Frontend Developer" className="pl-10 h-12 border-2" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="experienceLevel"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Experience</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 border-2">
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="entry">Entry (0-2 yrs)</SelectItem>
                                    <SelectItem value="mid">Mid (2-5 yrs)</SelectItem>
                                    <SelectItem value="senior">Senior (5-8 yrs)</SelectItem>
                                    <SelectItem value="lead">Lead (8+ yrs)</SelectItem>
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
                                <FormLabel className="text-sm font-medium">Location</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input type="text" placeholder="City" className="pl-10 h-12 border-2" {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Skills */}
                        <div className="space-y-2">
                          <FormLabel className="text-sm font-medium">Skills</FormLabel>
                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {skills.map((skill) => (
                                <Badge key={skill} variant="secondary" className="gap-1 pl-3 pr-1 py-1">
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
                              placeholder="Add skill (e.g. React)"
                              className="h-10 border-2"
                              value={newSkill}
                              onChange={(e) => setNewSkill(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  addSkill()
                                }
                              }}
                            />
                            <Button type="button" variant="outline" size="icon" className="h-10 w-10 border-2" onClick={addSkill}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl text-base font-medium"
                      disabled={isLoading || isGoogleLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          <BadgeCheck className="mr-2 h-5 w-5" />
                          Create {isRecruiter ? "Recruiter" : ""} Account
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to role selection
                </Button>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="text-center text-sm text-muted-foreground w-full">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          )}

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </div>
  )
}
