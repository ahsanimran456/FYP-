"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Building2, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Sparkles, 
  Target, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  Globe,
  Shield,
  Clock,
  Award,
  ChevronRight,
  Play
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary to-accent opacity-30 blur-sm -z-10"></div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              TalentHub
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float-slow"></div>
        
        {/* Decorative grid */}
        <div className="absolute inset-0 hero-pattern"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-32 left-10 w-20 h-20 border border-primary/20 rounded-2xl rotate-12 animate-float hidden lg:block"></div>
        <div className="absolute top-48 right-20 w-16 h-16 bg-gradient-to-br from-accent/20 to-accent/5 rounded-xl -rotate-12 animate-float-slow hidden lg:block"></div>
        <div className="absolute bottom-32 left-1/4 w-12 h-12 border-2 border-accent/30 rounded-full animate-bounce-subtle hidden lg:block"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left animate-slide-in-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary mb-6">
                <Sparkles className="h-4 w-4" />
                AI-Powered Recruitment Platform
                <ChevronRight className="h-4 w-4" />
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Find Your Perfect
                <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                  Career Match
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Connect talented professionals with amazing opportunities. Our AI-powered platform streamlines hiring and job searching like never before.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/signup">
                  <Button size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:scale-105">
                    <Zap className="mr-2 h-5 w-5" />
                    Start Hiring Now
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base border-2 bg-transparent hover:bg-accent/5 group">
                    <Play className="mr-2 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    Find Your Dream Job
                  </Button>
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background flex items-center justify-center text-xs font-bold text-white">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <strong className="text-foreground">50K+</strong> users joined
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-1">4.9/5 rating</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative animate-slide-in-right hidden lg:block">
              <div className="relative">
                {/* Main image container */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 border border-primary/10">
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80" 
                    alt="Team collaboration"
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent"></div>
                </div>
                
                {/* Floating cards */}
                <div className="absolute -left-8 top-1/4 glass-card rounded-2xl p-4 shadow-xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Application Sent!</p>
                      <p className="text-sm text-muted-foreground">Just now</p>
                    </div>
                  </div>
                </div>
                
                <div className="absolute -right-4 bottom-1/4 glass-card rounded-2xl p-4 shadow-xl animate-float-slow">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">New Job Match</p>
                      <p className="text-sm text-muted-foreground">95% Match Score</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, value: "50K+", label: "Active Users", color: "from-blue-500 to-blue-600" },
              { icon: Briefcase, value: "10K+", label: "Jobs Posted", color: "from-teal-500 to-teal-600" },
              { icon: Building2, value: "5K+", label: "Companies", color: "from-green-500 to-green-600" },
              { icon: TrendingUp, value: "95%", label: "Success Rate", color: "from-orange-500 to-orange-600" },
            ].map((stat, index) => (
              <Card 
                key={index} 
                className={`card-hover border-none bg-card/50 backdrop-blur-sm p-6 animate-slide-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <stat.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent"></div>
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-2 text-sm font-medium text-accent mb-4">
              <Target className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything you need to
              <span className="block mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                hire smarter
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform combines AI technology with intuitive design to make recruitment effortless
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: "AI Smart Matching", desc: "Our AI analyzes skills, experience, and culture fit to find perfect matches.", color: "from-primary to-primary/80" },
              { icon: Zap, title: "One-Click Apply", desc: "Streamlined applications with auto-fill and resume parsing technology.", color: "from-accent to-accent/80" },
              { icon: Clock, title: "Interview Scheduling", desc: "Integrated calendar tools for seamless interview coordination.", color: "from-chart-3 to-chart-3/80" },
              { icon: TrendingUp, title: "Analytics Dashboard", desc: "Track metrics, conversion rates, and hiring performance in real-time.", color: "from-chart-4 to-chart-4/80" },
              { icon: Users, title: "Team Collaboration", desc: "Work together with your team to review and rate candidates.", color: "from-blue-500 to-blue-600" },
              { icon: Shield, title: "Enterprise Security", desc: "Bank-grade encryption and compliance with global standards.", color: "from-chart-5 to-chart-5/80" },
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="group card-hover border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 hover:border-primary/30"
              >
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary mb-4">
              <Globe className="h-4 w-4" />
              Simple Process
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Get started in
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> 3 easy steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Account", desc: "Sign up in seconds with email or Google. Choose your role - recruiter or job seeker.", icon: Users },
              { step: "02", title: "Complete Profile", desc: "Add your details, upload resume or post jobs. Our AI helps optimize your profile.", icon: Award },
              { step: "03", title: "Start Connecting", desc: "Match with opportunities or candidates. Schedule interviews and track progress.", icon: Zap },
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="text-8xl font-bold text-primary/10 absolute -top-6 left-0 group-hover:text-primary/20 transition-colors">
                  {item.step}
                </div>
                <Card className="card-hover relative mt-8 border-none bg-card/80 backdrop-blur-sm p-8 shadow-lg">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6">
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </Card>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-accent"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-4 py-2 text-sm font-medium text-accent mb-4">
              <Star className="h-4 w-4" />
              Testimonials
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Loved by thousands of
              <span className="block mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                recruiters & job seekers
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Sarah Johnson", role: "HR Director", company: "TechCorp", quote: "TalentHub transformed our hiring process. We reduced time-to-hire by 60% and found amazing candidates.", avatar: "S" },
              { name: "Michael Chen", role: "Software Engineer", company: "StartupXYZ", quote: "Found my dream job within 2 weeks! The AI matching is incredibly accurate and saved me so much time.", avatar: "M" },
              { name: "Emily Davis", role: "Talent Manager", company: "GlobalInc", quote: "The analytics dashboard gives us insights we never had before. Best investment we made for recruitment.", avatar: "E" },
            ].map((testimonial, index) => (
              <Card key={index} className="card-hover border border-border/50 p-6 bg-gradient-to-br from-card to-card/80">
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground italic mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-90"></div>
        <div className="absolute inset-0 hero-pattern opacity-10"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white/20 rounded-full animate-float"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 border-2 border-white/20 rounded-2xl rotate-45 animate-float-slow"></div>
        
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to transform your hiring?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of companies and professionals who found their perfect match with TalentHub
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-14 px-10 text-base bg-white text-primary hover:bg-white/90 shadow-xl transition-all hover:scale-105">
                <Zap className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-10 text-base border-2 border-white text-white bg-transparent hover:bg-white/10">
                Sign In
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">TalentHub</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The AI-powered platform connecting talent with opportunity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 TalentHub. All rights reserved. Made with ❤️ for the future of work.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
