import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Building2, Users, Briefcase, TrendingUp, Sparkles, Target, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">TalentHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 px-4 py-24 sm:px-6 lg:px-8">
        {/* Decorative blobs */}
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-tl from-accent/20 to-transparent blur-3xl" />

        <div className="relative mx-auto max-w-7xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            The Future of Hiring is Here
          </div>
          <h1 className="text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Connect talent with{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              opportunity
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            The complete platform to streamline your hiring process. Find the perfect candidates, manage applications
            effortlessly, and build your dream team.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 bg-gradient-to-r from-primary to-accent px-8 hover:opacity-90">
                <Zap className="mr-2 h-5 w-5" />
                Start Hiring
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="h-12 border-2 bg-transparent px-8">
                Find Jobs
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mx-auto mt-20 max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">50K+</p>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                </div>
              </div>
            </Card>
            <Card className="border-none bg-gradient-to-br from-teal-500/10 to-teal-500/5 p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">10K+</p>
                  <p className="text-sm font-medium text-muted-foreground">Jobs Posted</p>
                </div>
              </div>
            </Card>
            <Card className="border-none bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">5K+</p>
                  <p className="text-sm font-medium text-muted-foreground">Companies</p>
                </div>
              </div>
            </Card>
            <Card className="border-none bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6 shadow-lg transition-all hover:scale-105 hover:shadow-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">95%</p>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-accent/5 to-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
              <Target className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Everything you need to succeed</h2>
            <p className="mt-4 text-lg text-muted-foreground">Powerful features for both recruiters and job seekers</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group border-none bg-gradient-to-br from-card to-primary/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Smart Matching</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                AI-powered algorithms match candidates with the right opportunities based on skills and experience.
              </p>
            </Card>
            <Card className="group border-none bg-gradient-to-br from-card to-accent/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent/80">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Easy Application</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Streamlined application process with resume parsing and one-click apply features.
              </p>
            </Card>
            <Card className="group border-none bg-gradient-to-br from-card to-chart-3/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-chart-3 to-chart-3/80">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Interview Scheduling</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Integrated calendar and scheduling tools to coordinate interviews effortlessly.
              </p>
            </Card>
            <Card className="group border-none bg-gradient-to-br from-card to-chart-4/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-chart-4 to-chart-4/80">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Analytics Dashboard</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Track your hiring metrics and application progress with detailed insights.
              </p>
            </Card>
            <Card className="group border-none bg-gradient-to-br from-card to-blue-500/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Team Collaboration</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Work together with your team to review candidates and make hiring decisions.
              </p>
            </Card>
            <Card className="group border-none bg-gradient-to-br from-card to-chart-5/5 p-6 shadow-md transition-all hover:scale-105 hover:shadow-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-chart-5 to-chart-5/80">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground">Mobile Access</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                Manage your recruitment process on the go with our fully responsive platform.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 flex justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 TalentHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
