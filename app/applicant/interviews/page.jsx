import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Video, MapPin, Building2, FileText, CheckCircle2 } from "lucide-react"

export default function InterviewsPage() {
  const upcomingInterviews = [
    {
      id: 1,
      company: "TechCorp Inc.",
      position: "Senior Frontend Developer",
      date: "2024-01-25",
      time: "2:00 PM - 3:00 PM",
      type: "Video Call",
      interviewer: "Sarah Johnson",
      interviewerTitle: "Engineering Manager",
      location: "Google Meet",
      notes: "Technical interview - be prepared to discuss React and Next.js",
      status: "Confirmed",
    },
    {
      id: 2,
      company: "StartupXYZ",
      position: "Full Stack Engineer",
      date: "2024-01-27",
      time: "10:00 AM - 11:00 AM",
      type: "Phone Screen",
      interviewer: "Michael Chen",
      interviewerTitle: "Lead Developer",
      location: "Phone",
      notes: "Initial screening call with the hiring manager",
      status: "Confirmed",
    },
  ]

  const pastInterviews = [
    {
      id: 3,
      company: "Digital Solutions",
      position: "React Developer",
      date: "2024-01-15",
      time: "3:00 PM - 4:00 PM",
      type: "Video Call",
      result: "Moved to next round",
    },
    {
      id: 4,
      company: "Innovation Labs",
      position: "Frontend Engineer",
      date: "2024-01-10",
      time: "1:00 PM - 2:00 PM",
      type: "In-person",
      result: "Position filled",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Interview Schedule</h1>
        <p className="mt-2 text-muted-foreground">Manage your upcoming and past interviews</p>
      </div>

      {/* Upcoming Interviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Upcoming Interviews</h2>
        {upcomingInterviews.map((interview) => (
          <Card key={interview.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border bg-background">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{interview.position}</CardTitle>
                    <p className="text-sm text-muted-foreground">{interview.company}</p>
                  </div>
                </div>
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {interview.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Interview Details Grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">
                        {new Date(interview.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium text-foreground">{interview.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Video className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium text-foreground">{interview.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">{interview.location}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Interviewer Info */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Interviewer</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {interview.interviewer
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{interview.interviewer}</p>
                      <p className="text-sm text-muted-foreground">{interview.interviewerTitle}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-lg border-l-4 border-primary bg-muted/30 p-4">
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Interview Notes</p>
                      <p className="mt-1 text-sm text-muted-foreground">{interview.notes}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button>Join Meeting</Button>
                  <Button variant="outline">Add to Calendar</Button>
                  <Button variant="outline">Send Message</Button>
                  <Button variant="ghost">Reschedule</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Past Interviews */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Past Interviews</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {pastInterviews.map((interview) => (
            <Card key={interview.id}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{interview.position}</h3>
                      <p className="text-sm text-muted-foreground">{interview.company}</p>
                    </div>
                    <Badge variant="outline">{interview.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(interview.date).toLocaleDateString()}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Result:</p>
                    <Badge
                      className={
                        interview.result === "Moved to next round"
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-gray-500/10 text-gray-700 dark:text-gray-400"
                      }
                    >
                      {interview.result}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
