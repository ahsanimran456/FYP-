"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Building2,
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Plus,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { doc, onSnapshot, collection, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function RecruiterLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userAvatar, setUserAvatar] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationBadge, setShowNotificationBadge] = useState(false)
  const previousApplicantsRef = useRef({})
  const notificationSound = useRef(null)

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3
      
      oscillator.start()
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      console.log("Audio not supported")
    }
  }

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    const role = localStorage.getItem("userRole")
    const name = localStorage.getItem("userName") || "Recruiter"
    const email = localStorage.getItem("userEmail") || "recruiter@example.com"
    const userId = localStorage.getItem("userId")
    const company = localStorage.getItem("companyName") || ""

    if (!auth || role !== "recruiter") {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      setUserName(name)
      setUserEmail(email)
      setCompanyName(company)
      
      const unsubscribers = []
      
      // Real-time listener for user profile (including avatar)
      if (userId) {
        const userUnsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
          if (doc.exists()) {
            const data = doc.data()
            if (data.avatarUrl) setUserAvatar(data.avatarUrl)
            if (data.name) setUserName(data.name)
            if (data.companyName) {
              setCompanyName(data.companyName)
              localStorage.setItem("companyName", data.companyName)
            }
          }
        })
        unsubscribers.push(userUnsubscribe)
        
        // Real-time listener for new applicants (notifications)
        const jobsQuery = query(
          collection(db, "jobs"),
          where("recruiterId", "==", userId)
        )
        
        const jobsUnsubscribe = onSnapshot(jobsQuery, (snapshot) => {
          const newNotifications = []
          let hasNewApplicant = false
          
          snapshot.docs.forEach((jobDoc) => {
            const jobData = jobDoc.data()
            const jobTitle = jobData.jobtitle || jobData.title || "Job"
            const applicants = jobData.applicants || []
            const jobId = jobDoc.id
            
            // Check for new applicants
            const prevApplicantIds = previousApplicantsRef.current[jobId] || []
            const currentApplicantIds = applicants.map(a => a.applicantId)
            
            applicants.forEach((applicant) => {
              // Check if this is a new applicant
              if (!prevApplicantIds.includes(applicant.applicantId)) {
                hasNewApplicant = true
              }
              
              // Add recent applicants to notifications (last 24 hours)
              const appliedAt = applicant.appliedAt ? new Date(applicant.appliedAt) : new Date()
              const hoursSinceApplied = (Date.now() - appliedAt.getTime()) / (1000 * 60 * 60)
              
              if (hoursSinceApplied < 24) {
                newNotifications.push({
                  id: `${jobId}_${applicant.applicantId}`,
                  type: "new_applicant",
                  title: "New Application",
                  message: `${applicant.applicantName || "Someone"} applied for ${jobTitle}`,
                  time: appliedAt,
                  jobId: jobId,
                  read: false,
                })
              }
            })
            
            // Update previous applicants reference
            previousApplicantsRef.current[jobId] = currentApplicantIds
          })
          
          // Sort by time (newest first)
          newNotifications.sort((a, b) => b.time - a.time)
          
          // Keep only the latest 10 notifications
          setNotifications(newNotifications.slice(0, 10))
          setUnreadCount(newNotifications.length)
          
          // Play sound if new applicant and not first load
          if (hasNewApplicant && Object.keys(previousApplicantsRef.current).length > 0) {
            playNotificationSound()
            setShowNotificationBadge(true)
          }
        })
        unsubscribers.push(jobsUnsubscribe)
      }
      
      return () => {
        unsubscribers.forEach(unsub => unsub())
      }
    }
  }, [router])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/")
  }

  // Format time ago
  const formatTimeAgo = (date) => {
    if (!date) return "Just now"
    const now = new Date()
    const diff = now - new Date(date)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(date).toLocaleDateString()
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/recruiter/dashboard" },
    { icon: Briefcase, label: "Jobs", href: "/recruiter/jobs" },
    { icon: Users, label: "Candidates", href: "/recruiter/candidates" },
    { icon: Calendar, label: "Interviews", href: "/recruiter/interviews" },
    { icon: Settings, label: "Settings", href: "/recruiter/settings" },
  ]

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-6">
            <Link href="/recruiter/dashboard" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">TalentHub</span>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                </Link>
              )
            })}
          </nav>

          {/* Quick Action */}
          <div className="border-t p-4">
            <Link href="/recruiter/jobs/new">
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Post New Job
              </Button>
            </Link>
          </div>

          {/* User Profile */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={userAvatar || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground">Recruiter</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/recruiter/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Header Left - Welcome Message */}
          <div className="hidden md:flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Welcome back, <span className="text-primary">{userName.split(" ")[0]}</span>
              </span>
            </div>
            {companyName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {companyName}
              </div>
            )}
          </div>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <DropdownMenu onOpenChange={() => setShowNotificationBadge(false)}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {(unreadCount > 0 || showNotificationBadge) && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount || "!"}
                      </span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No new notifications</p>
                      <p className="text-xs text-muted-foreground/70">You're all caught up!</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className="flex items-start gap-3 p-3 cursor-pointer"
                        onClick={() => router.push(`/recruiter/candidates?job=${notification.jobId}`)}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.time)}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </ScrollArea>
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-center justify-center text-primary"
                      onClick={() => router.push("/recruiter/candidates")}
                    >
                      View all candidates
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User Avatar with Quick Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-muted/50 pl-2 pr-3 py-1 transition-colors hover:bg-muted">
                  <Avatar className="h-7 w-7 border border-primary/20">
                    <AvatarImage src={userAvatar || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium">{userName.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/recruiter/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 lg:p-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
