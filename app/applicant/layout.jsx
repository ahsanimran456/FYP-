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
  FileText,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Sparkles,
  Settings,
  PartyPopper,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { doc, onSnapshot, collection } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ApplicantLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userAvatar, setUserAvatar] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationBadge, setShowNotificationBadge] = useState(false)
  const previousStatusesRef = useRef({})

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 880
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
    const name = localStorage.getItem("userName") || "User"
    const email = localStorage.getItem("userEmail") || "user@example.com"
    const userId = localStorage.getItem("userId")

    if (!auth || role !== "applicant") {
      router.push("/login")
    } else {
      setIsAuthenticated(true)
      setUserName(name)
      setUserEmail(email)
      
      const unsubscribers = []
      
      // Real-time listener for user profile (including avatar)
      if (userId) {
        const userUnsubscribe = onSnapshot(doc(db, "users", userId), (doc) => {
          if (doc.exists()) {
            const data = doc.data()
            if (data.avatarUrl) setUserAvatar(data.avatarUrl)
            if (data.name) setUserName(data.name)
          }
        })
        unsubscribers.push(userUnsubscribe)
        
        // Real-time listener for application status changes
        const jobsUnsubscribe = onSnapshot(collection(db, "jobs"), (snapshot) => {
          const newNotifications = []
          let hasStatusChange = false
          
          snapshot.docs.forEach((jobDoc) => {
            const jobData = jobDoc.data()
            const jobTitle = jobData.jobtitle || jobData.title || "Job"
            const companyName = jobData.companyName || "Company"
            const applicants = jobData.applicants || []
            const jobId = jobDoc.id
            
            // Find user's application
            const userApplication = applicants.find(a => a.applicantId === userId)
            
            if (userApplication) {
              const currentStatus = userApplication.status || "applied"
              const applicationKey = `${jobId}_${userId}`
              const previousStatus = previousStatusesRef.current[applicationKey]
              
              // Check if status changed
              if (previousStatus && previousStatus !== currentStatus) {
                hasStatusChange = true
                
                // Create notification for status change
                const statusMessages = {
                  shortlisted: { title: "🎉 Shortlisted!", message: `Congratulations! You've been shortlisted for ${jobTitle} at ${companyName}`, type: "success" },
                  interview_scheduled: { title: "📅 Interview Scheduled", message: `Interview scheduled for ${jobTitle} at ${companyName}`, type: "info" },
                  rejected: { title: "Application Update", message: `Your application for ${jobTitle} at ${companyName} has been reviewed`, type: "neutral" },
                  hired: { title: "🎊 Congratulations!", message: `You've been hired for ${jobTitle} at ${companyName}!`, type: "success" },
                }
                
                const notification = statusMessages[currentStatus]
                if (notification) {
                  newNotifications.unshift({
                    id: `${applicationKey}_${Date.now()}`,
                    ...notification,
                    status: currentStatus,
                    time: new Date(),
                    jobId: jobId,
                  })
                }
              }
              
              // Update previous status
              previousStatusesRef.current[applicationKey] = currentStatus
              
              // Add recent status changes to notifications (if not "applied")
              if (currentStatus !== "applied") {
                const updatedAt = userApplication.updatedAt ? new Date(userApplication.updatedAt) : new Date()
                const hoursSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60)
                
                if (hoursSinceUpdate < 48) {
                  const statusInfo = {
                    shortlisted: { title: "Shortlisted", icon: "star", type: "success" },
                    interview_scheduled: { title: "Interview Scheduled", icon: "calendar", type: "info" },
                    rejected: { title: "Not Selected", icon: "x", type: "neutral" },
                    hired: { title: "Hired!", icon: "party", type: "success" },
                  }
                  
                  const info = statusInfo[currentStatus]
                  if (info && !newNotifications.find(n => n.id === `${applicationKey}_${currentStatus}`)) {
                    newNotifications.push({
                      id: `${applicationKey}_${currentStatus}`,
                      title: info.title,
                      message: `${jobTitle} at ${companyName}`,
                      status: currentStatus,
                      type: info.type,
                      time: updatedAt,
                      jobId: jobId,
                    })
                  }
                }
              }
            }
          })
          
          // Sort by time (newest first)
          newNotifications.sort((a, b) => new Date(b.time) - new Date(a.time))
          
          // Keep only the latest 10 notifications
          setNotifications(newNotifications.slice(0, 10))
          setUnreadCount(newNotifications.filter(n => n.type === "success" || n.type === "info").length)
          
          // Play sound if status changed and not first load
          if (hasStatusChange && Object.keys(previousStatusesRef.current).length > 1) {
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

  // Get notification icon
  const getNotificationIcon = (status) => {
    switch (status) {
      case "shortlisted":
        return <Star className="h-4 w-4 text-yellow-500" />
      case "interview_scheduled":
        return <Calendar className="h-4 w-4 text-blue-500" />
      case "hired":
        return <PartyPopper className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-primary" />
    }
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/applicant/dashboard" },
    { icon: Briefcase, label: "Find Jobs", href: "/applicant/jobs" },
    { icon: FileText, label: "My Applications", href: "/applicant/applications" },
    { icon: Calendar, label: "Interviews", href: "/applicant/interviews" },
    { icon: User, label: "Profile", href: "/applicant/profile" },
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
            <Link href="/applicant/dashboard" className="flex items-center gap-2">
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
                    <p className="text-xs text-muted-foreground">Applicant</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/applicant/profile">Profile Settings</Link>
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
                Welcome, <span className="text-primary">{userName.split(" ")[0]}</span>
              </span>
            </div>
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
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
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
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                      {unreadCount} updates
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                      <p className="text-xs text-muted-foreground/70">Updates will appear here</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id} 
                        className="flex items-start gap-3 p-3 cursor-pointer"
                        onClick={() => router.push("/applicant/applications")}
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          notification.type === "success" ? "bg-green-500/10" : 
                          notification.type === "info" ? "bg-blue-500/10" : "bg-gray-500/10"
                        )}>
                          {getNotificationIcon(notification.status)}
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
                      onClick={() => router.push("/applicant/applications")}
                    >
                      View all applications
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
                  <Link href="/applicant/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
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
