"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Building2, Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle2, Users, Briefcase } from "lucide-react"
import { signInWithEmail, signInWithGoogle } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)

    try {
      const { user, userData } = await signInWithEmail({ email, password })
      
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", user.email || email)
      localStorage.setItem("userId", user.uid)
      
      if (userData) {
        localStorage.setItem("userName", userData.name || "")
        localStorage.setItem("userRole", userData.role || "applicant")
        if (userData.companyName) {
          localStorage.setItem("companyName", userData.companyName)
        }
      }

      const userRole = userData?.role || "applicant"

      toast({
        title: "Welcome back!",
        description: `Signed in successfully. Redirecting to your dashboard...`,
      })

      setTimeout(() => {
        if (userRole === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1000)
      
    } catch (error) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    
    try {
      const { user, userData, isNewUser } = await signInWithGoogle()
      
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userEmail", user.email || "")
      localStorage.setItem("userId", user.uid)
      
      if (userData) {
        localStorage.setItem("userName", userData.name || user.displayName || "")
        localStorage.setItem("userRole", userData.role || "applicant")
        if (userData.companyName) {
          localStorage.setItem("companyName", userData.companyName)
        }
      }

      const userRole = userData?.role || "applicant"

      toast({
        title: isNewUser ? "Welcome to TalentHub!" : "Welcome back!",
        description: isNewUser 
          ? "Your account has been created. Redirecting to your dashboard..."
          : "Signed in with Google successfully. Redirecting...",
      })

      setTimeout(() => {
        if (userRole === "recruiter") {
          router.push("/recruiter/dashboard")
        } else {
          router.push("/applicant/dashboard")
        }
      }, 1000)
      
    } catch (error) {
      toast({
        title: "Google login failed",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      {/* Left Side - Image */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 hero-pattern opacity-10"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-white/20 rounded-full animate-float"></div>
        <div className="absolute bottom-32 right-10 w-24 h-24 border-2 border-white/20 rounded-2xl rotate-45 animate-float-slow"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/10 rounded-xl animate-bounce-subtle"></div>
        
        <div className="relative z-10 p-12 flex flex-col justify-center max-w-lg">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TalentHub</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Welcome back to
            <span className="block">your career hub</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-10">
            Sign in to access your dashboard, manage applications, and continue your journey to success.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: Sparkles, text: "AI-powered job matching" },
              { icon: Users, text: "Connect with top employers" },
              { icon: Briefcase, text: "Track your applications" },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-12 glass-card rounded-2xl p-6 bg-white/10 backdrop-blur-sm border border-white/20">
            <p className="text-white italic mb-4">
              "TalentHub helped me find my dream job within weeks. The AI matching is incredibly accurate!"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                S
              </div>
              <div>
                <p className="text-white font-semibold">Sarah Johnson</p>
                <p className="text-white/60 text-sm">Software Engineer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Background Image Overlay */}
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80" 
            alt="Team collaboration"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex items-center justify-center bg-background p-4 sm:p-8">
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

          <Card className="border-none shadow-2xl shadow-primary/10">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>Sign in to your account to continue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 bg-transparent border-2 hover:bg-muted/50 transition-all"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in with Google...
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
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10 h-12 border-2 focus:border-primary transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-12 border-2 focus:border-primary transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl text-base font-medium"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                  Sign up for free
                </Link>
              </div>
            </CardFooter>
          </Card>

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
