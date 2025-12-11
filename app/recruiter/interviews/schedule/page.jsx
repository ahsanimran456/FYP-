"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Video, Phone, MapPin, ArrowLeft, Loader2 } from "lucide-react"

export default function ScheduleInterviewPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [interviewType, setInterviewType] = useState("video")
  const [formData, setFormData] = useState({
    candidate: "",
    position: "",
    date: "",
    startTime: "",
    endTime: "",
    meetingLink: "",
    phone: "",
    location: "",
    notes: "",
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      router.push("/recruiter/interviews")
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Interviews
        </Button>
        <h1 className="text-3xl font-bold text-foreground">Schedule New Interview</h1>
        <p className="mt-2 text-muted-foreground">Set up an interview with a candidate</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Interview Details</CardTitle>
            <CardDescription>Fill in the information below to schedule an interview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Candidate Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Candidate Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="candidate">Candidate Name</Label>
                  <Input
                    id="candidate"
                    placeholder="John Doe"
                    value={formData.candidate}
                    onChange={(e) => setFormData({ ...formData, candidate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    placeholder="Senior Frontend Developer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Schedule</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      className="pl-9"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="startTime"
                      type="time"
                      className="pl-9"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="endTime"
                      type="time"
                      className="pl-9"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Type */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Interview Type</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setInterviewType("video")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    interviewType === "video"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      interviewType === "video" ? "bg-gradient-to-br from-primary to-accent" : "bg-muted"
                    }`}
                  >
                    <Video className={`h-6 w-6 ${interviewType === "video" ? "text-white" : "text-foreground"}`} />
                  </div>
                  <span className="font-medium text-foreground">Video Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewType("phone")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    interviewType === "phone"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      interviewType === "phone" ? "bg-gradient-to-br from-primary to-accent" : "bg-muted"
                    }`}
                  >
                    <Phone className={`h-6 w-6 ${interviewType === "phone" ? "text-white" : "text-foreground"}`} />
                  </div>
                  <span className="font-medium text-foreground">Phone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewType("onsite")}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                    interviewType === "onsite"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      interviewType === "onsite" ? "bg-gradient-to-br from-primary to-accent" : "bg-muted"
                    }`}
                  >
                    <MapPin className={`h-6 w-6 ${interviewType === "onsite" ? "text-white" : "text-foreground"}`} />
                  </div>
                  <span className="font-medium text-foreground">On-site</span>
                </button>
              </div>
            </div>

            {/* Type-specific fields */}
            {interviewType === "video" && (
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <div className="relative">
                  <Video className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="meetingLink"
                    type="url"
                    placeholder="https://meet.google.com/..."
                    className="pl-9"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    required={interviewType === "video"}
                  />
                </div>
              </div>
            )}

            {interviewType === "phone" && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="pl-9"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required={interviewType === "phone"}
                  />
                </div>
              </div>
            )}

            {interviewType === "onsite" && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Office - Conference Room A"
                    className="pl-9"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required={interviewType === "onsite"}
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Interview Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or agenda items for this interview..."
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Interview"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
