"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, AuthError } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { auth } from "@/firebase/firebase";

// Define interface for Kakao Postcode data
interface KakaoPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  // Use more specific type for additional properties
  [key: string]: string | number | boolean | null | undefined;
}

// Make Kakao accessible in global scope
declare global {
  interface Window {
    daum: {
      Postcode: new (config: { oncomplete: (data: KakaoPostcodeData) => void }) => { open: () => void };
    };
  }
}

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const router = useRouter();

  const searchAddress = () => {
    if (!scriptLoaded) {
      alert("Address search functionality is still loading. Please wait a moment.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: KakaoPostcodeData) {
        // Get the road address
        const fullAddress = data.roadAddress || data.jibunAddress;
        setAddress(fullAddress);
        
        // Focus on the detail address input
        document.getElementById("detailAddress")?.focus();
      }
    }).open();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate email format
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate matching passwords
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError("Password should be at least 6 characters");
      return;
    }

    // Validate name
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // Validate phone number (basic validation)
    const phonePattern = /^\d{3}-\d{3,4}-\d{4}$/;
    if (!phonePattern.test(phoneNumber)) {
      setError("Phone number should be in format: 010-1234-5678");
      return;
    }

    // Validate address
    if (!address.trim()) {
      setError("Address is required");
      return;
    }

    setLoading(true);

    try {
      // Create the user with email and password
      await createUserWithEmailAndPassword(auth, email, password);
      
      // Here you would typically save additional user information to your database
      // For example, using Firestore:
      // const user = userCredential.user;
      // await addDoc(collection(db, "users"), {
      //   uid: user.uid,
      //   name,
      //   phoneNumber,
      //   address: address + ' ' + detailAddress,
      //   createdAt: new Date(),
      // });
      
      router.push("/login"); // Redirect to talk page after successful registration
    } catch (error: unknown) {
      const authError = error as AuthError;
      setError(authError.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, "");
    
    // Format with hyphens
    if (value.length <= 3) {
      setPhoneNumber(value);
    } else if (value.length <= 7) {
      setPhoneNumber(`${value.slice(0, 3)}-${value.slice(3)}`);
    } else {
      setPhoneNumber(`${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`);
    }
  };

  return (
    <>
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={() => setScriptLoaded(true)}
      />
      
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Create an Account</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Join us and start talking in English
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your full name"
                />
              </div>
              
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your email"
                />
              </div>
              
              {/* Phone Number Field */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="010-1234-5678"
                />
              </div>
              
              {/* Address Fields */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium">
                  Address
                </label>
                <div className="flex space-x-2">
                  <input
                    id="address"
                    type="text"
                    required
                    readOnly
                    value={address}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Your address"
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    className="mt-1 whitespace-nowrap rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              {/* Detail Address Field */}
              <div>
                <label htmlFor="detailAddress" className="block text-sm font-medium">
                  Detail Address
                </label>
                <input
                  id="detailAddress"
                  type="text"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Apartment number, floor, etc."
                />
              </div>
              
              {/* Password Fields */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Create a password"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 6 characters
                </p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center text-sm">
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
