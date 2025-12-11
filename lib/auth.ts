import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { SignupFormData, LoginFormData } from "./validation";

// User data interface for Firestore
export interface UserData {
  uid: string;
  name: string;
  email: string;
  role: "recruiter" | "applicant";
  phone?: string;
  createdAt: any;
  updatedAt: any;
  // Recruiter-specific fields
  companyName?: string;
  companyWebsite?: string;
  jobTitle?: string;
  companySize?: string;
  industry?: string;
  // Applicant-specific fields
  professionalTitle?: string;
  experienceLevel?: string;
  location?: string;
  linkedIn?: string;
  portfolio?: string;
  github?: string;
  skills?: string[];
  bio?: string;
  savedJobs?: string[];
  // File uploads (Supabase URLs)
  avatarUrl?: string;
  resumeUrl?: string;
  resumeName?: string;
  // Account status
  isActive: boolean;
  emailVerified: boolean;
}

/**
 * Sign up a new user with email and password
 * Creates user in Firebase Auth and stores additional data in Firestore
 * @param formData - User signup data including name, email, password, role, and additional fields
 * @returns Promise that resolves to the created user
 */
export const signUpWithEmail = async (formData: SignupFormData) => {
  try {
    console.log("🚀 Starting Firebase Authentication signup...", {
      email: formData.email,
      name: formData.name,
      role: formData.role,
    });

    // Create user account with email and password
    // Firebase handles password hashing automatically (bcrypt-like)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    const user = userCredential.user;
    console.log("✅ User created in Firebase Authentication:", {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
    });

    // Update user profile with display name
    try {
      await updateProfile(user, {
        displayName: formData.name,
      });
      console.log("✅ User profile updated with display name");
    } catch (profileError: any) {
      console.warn("⚠️ Failed to update profile (non-critical):", profileError.message);
    }

    // Prepare user data for Firestore
    const userData: UserData = {
      uid: user.uid,
      name: formData.name,
      email: formData.email,
      role: formData.role,
      phone: formData.phone || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      emailVerified: user.emailVerified,
    };

    // Add recruiter-specific fields if role is recruiter
    if (formData.role === "recruiter") {
      userData.companyName = formData.companyName || "";
      userData.companyWebsite = formData.companyWebsite || "";
      userData.jobTitle = formData.jobTitle || "";
      userData.companySize = formData.companySize || "";
      userData.industry = formData.industry || "";
    }

    // Add applicant-specific fields if role is applicant
    if (formData.role === "applicant") {
      userData.professionalTitle = formData.professionalTitle || "";
      userData.experienceLevel = formData.experienceLevel || "";
      userData.location = formData.location || "";
      userData.linkedIn = formData.linkedIn || "";
      userData.portfolio = formData.portfolio || "";
      userData.github = formData.github || "";
      userData.skills = formData.skills || [];
      userData.bio = formData.bio || "";
      userData.savedJobs = [];
    }

    // Save user data to Firestore
    try {
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("✅ User data saved to Firestore:", userData);
      
      // If recruiter, also create a company profile
      if (formData.role === "recruiter" && formData.companyName) {
        await setDoc(doc(db, "companies", user.uid), {
          ownerId: user.uid,
          name: formData.companyName,
          website: formData.companyWebsite || "",
          size: formData.companySize || "",
          industry: formData.industry || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isActive: true,
        });
        console.log("✅ Company profile created in Firestore");
      }
    } catch (firestoreError: any) {
      console.warn("⚠️ Failed to save to Firestore (non-critical):", firestoreError.message);
    }

    console.log("🎉 Signup completed successfully!");
    return user;
  } catch (error: any) {
    console.error("❌ Firebase Authentication error:", {
      code: error?.code,
      message: error?.message,
      error: error,
    });

    let errorMessage = "An error occurred during signup. Please try again.";
    
    if (error?.code === "auth/email-already-in-use") {
      errorMessage = "This email is already registered. Please use a different email or sign in.";
    } else if (error?.code === "auth/weak-password") {
      errorMessage = "Password is too weak. Please use a stronger password.";
    } else if (error?.code === "auth/invalid-email") {
      errorMessage = "Invalid email address. Please check your email and try again.";
    } else if (error?.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else if (error?.code === "auth/operation-not-allowed") {
      errorMessage = "Email/password authentication is not enabled. Please contact support.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Sign in an existing user with email and password
 * @param formData - User login data including email and password
 * @returns Promise that resolves to the signed in user
 */
export const signInWithEmail = async (formData: LoginFormData) => {
  try {
    console.log("🔐 Starting Firebase Authentication sign in...");

    const userCredential = await signInWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );

    const user = userCredential.user;
    console.log("✅ User signed in successfully:", {
      uid: user.uid,
      email: user.email,
    });

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.exists() ? userDoc.data() as UserData : null;

    console.log("🎉 Sign in completed successfully!");
    return { user, userData };
  } catch (error: any) {
    console.error("❌ Firebase Sign In error:", {
      code: error?.code,
      message: error?.message,
    });

    let errorMessage = "An error occurred during sign in. Please try again.";
    
    if (error?.code === "auth/user-not-found") {
      errorMessage = "No account found with this email. Please sign up first.";
    } else if (error?.code === "auth/wrong-password") {
      errorMessage = "Incorrect password. Please try again.";
    } else if (error?.code === "auth/invalid-credential") {
      errorMessage = "Invalid email or password. Please check your credentials.";
    } else if (error?.code === "auth/too-many-requests") {
      errorMessage = "Too many failed attempts. Please try again later.";
    } else if (error?.code === "auth/network-request-failed") {
      errorMessage = "Network error. Please check your internet connection.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    console.log("✅ User signed out successfully");
    
    // Clear local storage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("companyName");
  } catch (error: any) {
    console.error("❌ Sign out error:", error);
    throw new Error("Failed to sign out. Please try again.");
  }
};

/**
 * Get the current authenticated user
 * @returns The current user or null
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Get user data from Firestore
 * @param uid - User ID
 * @returns Promise that resolves to user data or null
 */
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

/**
 * Subscribe to auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
