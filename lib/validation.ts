import { z } from "zod";

// Base user fields shared by all users
const baseUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["recruiter", "applicant"], {
    required_error: "Please select a role",
  }),
});

// Recruiter-specific fields
const recruiterFieldsSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  companyWebsite: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .regex(/^[+]?[\d\s-]+$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  jobTitle: z
    .string()
    .min(2, "Job title must be at least 2 characters")
    .max(50, "Job title must be less than 50 characters")
    .optional()
    .or(z.literal("")),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  industry: z
    .string()
    .max(50, "Industry must be less than 50 characters")
    .optional()
    .or(z.literal("")),
});

// Applicant-specific fields
const applicantFieldsSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .regex(/^[+]?[\d\s-]+$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  // Applicant profile fields
  professionalTitle: z.string().optional(),
  experienceLevel: z.string().optional(),
  location: z.string().optional(),
  linkedIn: z.string().optional(),
  portfolio: z.string().optional(),
  github: z.string().optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
});

// Combined signup schema that includes both recruiter and applicant fields
// The form will conditionally show/hide fields based on role
export const signupSchema = baseUserSchema.extend({
  // Recruiter fields (required only for recruiters)
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  // Applicant fields
  professionalTitle: z.string().optional(),
  experienceLevel: z.string().optional(),
  location: z.string().optional(),
  linkedIn: z.string().optional(),
  portfolio: z.string().optional(),
  github: z.string().optional(),
  skills: z.array(z.string()).optional(),
  bio: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate recruiter-specific required fields
  if (data.role === "recruiter") {
    if (!data.companyName || data.companyName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required for recruiters",
        path: ["companyName"],
      });
    }
    if (data.companyName && data.companyName.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name must be less than 100 characters",
        path: ["companyName"],
      });
    }
  }
  
  // Validate phone if provided
  if (data.phone && data.phone.length > 0) {
    if (data.phone.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number must be at least 10 digits",
        path: ["phone"],
      });
    }
    if (!/^[+]?[\d\s-]+$/.test(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid phone number",
        path: ["phone"],
      });
    }
  }
  
  // Validate company website if provided
  if (data.companyWebsite && data.companyWebsite.length > 0) {
    try {
      new URL(data.companyWebsite);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid URL",
        path: ["companyWebsite"],
      });
    }
  }
});

export type SignupFormData = z.infer<typeof signupSchema>;

// Login validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
