"use client"

import { useState, useRef } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  Loader2,
  Sparkles,
  Send,
  Printer,
  X,
  DollarSign,
  Gift,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Edit3,
  Eye,
} from "lucide-react"

export function OfferLetterDialog({
  open,
  onOpenChange,
  candidate,
  jobTitle,
  companyName,
  onSendOffer,
  isSending = false,
}) {
  const [step, setStep] = useState(1) // 1: Form, 2: Preview/Edit
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLetter, setGeneratedLetter] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const printRef = useRef(null)
  
  // Form data
  const [formData, setFormData] = useState({
    monthlySalary: "",
    currency: "AED",
    probationPeriod: "3 months",
    joiningDate: "",
    workingHours: "9:00 AM - 6:00 PM",
    workingDays: "Monday to Friday",
    annualLeave: "22",
    sickLeave: "10",
    benefits: "",
    bonuses: "",
    additionalTerms: "",
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateOfferLetter = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch("/api/generate-offer-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            name: candidate?.name,
            email: candidate?.email,
          },
          jobTitle,
          companyName,
          offerDetails: formData,
        }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setGeneratedLetter(data.letter)
        setStep(2)
      } else {
        console.error("Failed to generate offer letter:", data.error)
      }
    } catch (error) {
      console.error("Error generating offer letter:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offer Letter - ${candidate?.name}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #1a1a1a;
            }
            .date {
              text-align: right;
              margin-bottom: 20px;
            }
            .content {
              white-space: pre-wrap;
            }
            .signature {
              margin-top: 50px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyName}</div>
            <div>Official Offer Letter</div>
          </div>
          <div class="date">Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div class="content">${generatedLetter.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleSendOffer = () => {
    onSendOffer({
      ...formData,
      letterContent: generatedLetter,
      generatedAt: new Date().toISOString(),
    })
  }

  const resetDialog = () => {
    setStep(1)
    setGeneratedLetter("")
    setIsEditing(false)
    setFormData({
      monthlySalary: "",
      currency: "AED",
      probationPeriod: "3 months",
      joiningDate: "",
      workingHours: "9:00 AM - 6:00 PM",
      workingDays: "Monday to Friday",
      annualLeave: "22",
      sickLeave: "10",
      benefits: "",
      bonuses: "",
      additionalTerms: "",
    })
  }

  const isFormValid = () => {
    return formData.monthlySalary && formData.joiningDate
  }

  // Format date for joining date input
  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetDialog()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {step === 1 ? "Create Offer Letter" : "Review Offer Letter"}
                </DialogTitle>
                <DialogDescription>
                  {step === 1 
                    ? "Fill in the offer details and generate with AI"
                    : "Review, print, or send the offer letter"
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* AI Feature Banner - Only show in step 1 */}
          {step === 1 && (
            <div className="relative overflow-hidden rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 p-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30">
                  <Sparkles className="h-7 w-7 text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-purple-700 dark:text-purple-300 text-lg">
                      AI-Powered Generation
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      NEW
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fill in the details below and our AI will craft a professional, personalized offer letter instantly!
                  </p>
                </div>
                <div className="hidden md:block">
                  <Button
                    onClick={generateOfferLetter}
                    disabled={!isFormValid() || isGenerating}
                    size="lg"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 text-white font-semibold"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {/* Mobile button */}
              <div className="md:hidden mt-3">
                <Button
                  onClick={generateOfferLetter}
                  disabled={!isFormValid() || isGenerating}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 text-white font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
              {!isFormValid() && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Please fill in Monthly Salary and Joining Date to enable AI generation
                </p>
              )}
            </div>
          )}

        {/* Candidate Info */}
        {candidate && (
          <div className="flex items-center gap-4 rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
            <Avatar className="h-14 w-14 border-2 border-emerald-500/30">
              {candidate.avatar ? (
                <AvatarImage src={candidate.avatar} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  {candidate.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{candidate.name}</p>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
              <Badge className="mt-1 bg-emerald-100 text-emerald-700 border-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Interview Completed
              </Badge>
            </div>
          </div>
        )}

        {step === 1 ? (
          // Step 1: Form
          <div className="space-y-6 py-4">
            {/* Salary Section */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Compensation
                <span className="ml-auto text-xs font-normal text-purple-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI uses this
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Monthly Salary *</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.currency} 
                      onValueChange={(v) => handleInputChange("currency", v)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="15000"
                      value={formData.monthlySalary}
                      onChange={(e) => handleInputChange("monthlySalary", e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonuses">Bonuses & Allowances</Label>
                  <Input
                    id="bonuses"
                    placeholder="e.g., Housing: AED 3000, Transport: AED 1000"
                    value={formData.bonuses}
                    onChange={(e) => handleInputChange("bonuses", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Employment Details
                <span className="ml-auto text-xs font-normal text-purple-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI uses this
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date *</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => handleInputChange("joiningDate", e.target.value)}
                    min={today}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probation">Probation Period</Label>
                  <Select 
                    value={formData.probationPeriod} 
                    onValueChange={(v) => handleInputChange("probationPeriod", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 month">1 Month</SelectItem>
                      <SelectItem value="2 months">2 Months</SelectItem>
                      <SelectItem value="3 months">3 Months</SelectItem>
                      <SelectItem value="6 months">6 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHours">Working Hours</Label>
                  <Input
                    id="workingHours"
                    placeholder="9:00 AM - 6:00 PM"
                    value={formData.workingHours}
                    onChange={(e) => handleInputChange("workingHours", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingDays">Working Days</Label>
                  <Input
                    id="workingDays"
                    placeholder="Monday to Friday"
                    value={formData.workingDays}
                    onChange={(e) => handleInputChange("workingDays", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Leave & Benefits */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Gift className="h-4 w-4 text-purple-600" />
                Leave & Benefits
                <span className="ml-auto text-xs font-normal text-purple-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI uses this
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualLeave">Annual Leave (Days)</Label>
                  <Input
                    id="annualLeave"
                    type="number"
                    value={formData.annualLeave}
                    onChange={(e) => handleInputChange("annualLeave", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sickLeave">Sick Leave (Days)</Label>
                  <Input
                    id="sickLeave"
                    type="number"
                    value={formData.sickLeave}
                    onChange={(e) => handleInputChange("sickLeave", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits & Perks</Label>
                <Textarea
                  id="benefits"
                  placeholder="e.g., Health Insurance, Visa Sponsorship, Annual Air Tickets, Education Allowance..."
                  value={formData.benefits}
                  onChange={(e) => handleInputChange("benefits", e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Separator />

            {/* Additional Terms */}
            <div className="space-y-2">
              <Label htmlFor="additionalTerms">Additional Terms (Optional)</Label>
              <Textarea
                id="additionalTerms"
                placeholder="Any additional terms or conditions..."
                value={formData.additionalTerms}
                onChange={(e) => handleInputChange("additionalTerms", e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : (
          // Step 2: Preview & Edit
          <div className="py-4 space-y-4">
            {/* Edit Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {isEditing ? "✏️ Edit Mode - Modify the letter below" : "👀 Preview Mode - Review your letter"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isEditing ? "Make any changes you need, then preview again" : "Click Edit to make manual changes"}
                  </p>
                </div>
              </div>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className={isEditing ? "bg-gradient-to-r from-blue-500 to-purple-500" : ""}
              >
                {isEditing ? (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </>
                ) : (
                  <>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Letter
                  </>
                )}
              </Button>
            </div>

            {isEditing ? (
              // Edit Mode
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Tip: You can modify any part of the letter. Changes will be saved automatically.</span>
                </div>
                <Textarea
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  className="min-h-[400px] font-mono text-sm leading-relaxed"
                  placeholder="Offer letter content..."
                />
              </div>
            ) : (
              // Preview Mode
              <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-6" ref={printRef}>
                  <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{companyName}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Official Offer Letter</p>
                  </div>
                  <div className="text-right text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                    {generatedLetter}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Regenerate Option */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={generateOfferLetter}
                disabled={isGenerating}
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Regenerate with AI
              </Button>
              <span className="text-xs text-muted-foreground">
                Not satisfied? Generate a new version
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {/* Secondary AI button for footer - matches the prominent one above */}
              <Button
                onClick={generateOfferLetter}
                disabled={!isFormValid() || isGenerating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Edit
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSendOffer}
                disabled={isSending}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Offer Letter
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
