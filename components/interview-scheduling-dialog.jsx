"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Video,
  Phone,
  Building2,
  Loader2,
  Calendar,
  Clock,
  Mail,
  Link as LinkIcon,
} from "lucide-react"

// Generate time slots in 12-hour format with AM/PM
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      const ampm = hour < 12 ? "AM" : "PM"
      const minuteStr = minute.toString().padStart(2, "0")
      const display = `${hour12}:${minuteStr} ${ampm}`
      const value24 = `${hour.toString().padStart(2, "0")}:${minuteStr}`
      slots.push({ display, value24, hour, minute, ampm })
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

// Convert 24-hour time to 12-hour format with AM/PM
const formatTimeTo12Hour = (time24) => {
  if (!time24) return ""
  const [hours, minutes] = time24.split(":").map(Number)
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const ampm = hours < 12 ? "AM" : "PM"
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`
}

const interviewTypes = [
  {
    id: "google_meet",
    label: "Google Meet",
    icon: Video,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Video call via Google Meet",
  },
  {
    id: "zoom",
    label: "Zoom",
    icon: Video,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 border-indigo-200",
    description: "Video call via Zoom",
  },
  {
    id: "phone",
    label: "Phone Call",
    icon: Phone,
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Traditional phone interview",
  },
  {
    id: "onsite",
    label: "On-site",
    icon: Building2,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
    description: "In-person at office location",
  },
]

export function InterviewSchedulingDialog({
  open,
  onOpenChange,
  candidate,
  jobTitle,
  onSchedule,
  isScheduling = false,
}) {
  const [interviewType, setInterviewType] = useState("google_meet")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  const handleSchedule = () => {
    // Format time to 12-hour with AM/PM
    const formattedTime = formatTimeTo12Hour(time)
    
    // Format date to readable format
    const dateObj = new Date(date)
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    
    const interviewDetails = {
      type: interviewType,
      date: formattedDate,         // Formatted date (e.g., "Monday, January 15, 2024")
      rawDate: date,               // Raw date for sorting (e.g., "2024-01-15")
      time: formattedTime,         // Formatted time with AM/PM (e.g., "2:30 PM")
      rawTime: time,               // Raw 24-hour time (e.g., "14:30")
      link: meetingLink,
      phone: phoneNumber || candidate?.phone || "",
      location,
      notes,
    }
    onSchedule(interviewDetails)
  }

  const isFormValid = () => {
    if (!date || !time) return false
    switch (interviewType) {
      case "google_meet":
      case "zoom":
        return meetingLink.trim() !== ""
      case "phone":
        return (phoneNumber || candidate?.phone || "").trim() !== ""
      case "onsite":
        return location.trim() !== ""
      default:
        return false
    }
  }

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Schedule Interview</DialogTitle>
              <DialogDescription>
                Set up an interview with the candidate
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Candidate Info */}
        {candidate && (
          <div className="flex items-center gap-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4">
            <Avatar className="h-14 w-14 border-2 border-purple-500/30">
              {candidate.avatar ? (
                <AvatarImage src={candidate.avatar} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {candidate.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{candidate.name}</p>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
              {candidate.email && (
                <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {candidate.email}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* Interview Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Interview Type</Label>
            <RadioGroup
              value={interviewType}
              onValueChange={setInterviewType}
              className="grid grid-cols-2 gap-3"
            >
              {interviewTypes.map((type) => {
                const Icon = type.icon
                const isSelected = interviewType === type.id
                return (
                  <div key={type.id}>
                    <RadioGroupItem
                      value={type.id}
                      id={type.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.id}
                      className={`flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all hover:border-primary/50 ${
                        isSelected
                          ? `${type.bgColor} border-current ${type.color}`
                          : "border-muted bg-card hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${isSelected ? type.color : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${isSelected ? type.color : ""}`}>
                        {type.label}
                      </span>
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time">
                    {time ? formatTimeTo12Hour(time) : "Select time"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot.value24} value={slot.value24}>
                      {slot.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Fields Based on Interview Type */}
          {(interviewType === "google_meet" || interviewType === "zoom") && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Meeting Link *
              </Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder={interviewType === "google_meet" ? "https://meet.google.com/..." : "https://zoom.us/j/..."}
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Paste your {interviewType === "google_meet" ? "Google Meet" : "Zoom"} meeting link
              </p>
            </div>
          )}

          {interviewType === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={candidate?.phone || "Enter phone number to call"}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              {candidate?.phone && !phoneNumber && (
                <p className="text-xs text-green-600">
                  Will use candidate's phone: {candidate.phone}
                </p>
              )}
            </div>
          )}

          {interviewType === "onsite" && (
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Office Location *
              </Label>
              <Textarea
                id="location"
                placeholder="Enter full address of interview location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for the candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isFormValid() || isScheduling}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule & Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

