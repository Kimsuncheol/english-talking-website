"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { auth } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

// Tutor data
const tutors = [
  { name: "Sarah", imageUrl: "https://i.pravatar.cc/150?img=1", status: "online" },
  { name: "John", imageUrl: "https://i.pravatar.cc/150?img=3", status: "online" },
  { name: "Emma", imageUrl: "https://i.pravatar.cc/150?img=5", status: "offline" },
  { name: "Michael", imageUrl: "https://i.pravatar.cc/150?img=8", status: "away" },
  { name: "Lisa", imageUrl: "https://i.pravatar.cc/150?img=9", status: "online" },
  { name: "David", imageUrl: "https://i.pravatar.cc/150?img=12", status: "offline" },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  
  const handleAvatarClick = (avatarName: string) => {
    if (isLoggedIn) {
      // If logged in, navigate to talk page with selected avatar
      router.push(`/voice-conversation?avatar=${avatarName}`);
    } else {
      // If not logged in, navigate to login page
      router.push("/login");
    }
  };

  return (
    <>
        <Header />
    <div className="min-h-screen p-6 pt-8">
      <div className="max-w-4xl mx-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold">Choose Your Speaking Partner</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Select an AI tutor to practice your English conversation skills
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
            {tutors.map((tutor) => (
              <Avatar 
                key={tutor.name}
                name={tutor.name} 
                imageUrl={tutor.imageUrl} 
                size="large" 
                status={tutor.status as "online" | "offline" | "away"} 
                showBadge={true} 
                isClickable={true} 
                onClick={() => handleAvatarClick(tutor.name)}
              />
            ))}
          </div>
          
          <div className="mt-8">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              {isLoggedIn ? (
                "Click on any avatar to start talking"
              ) : (
                <>
                  Please <a href="/login" className="text-blue-600 hover:underline">sign in</a> or <a href="/sign-up" className="text-blue-600 hover:underline">create an account</a> to start practicing
                </>
              )}
            </p>
          </div>
        </div>

        <div className="p-6 rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <h2 className="mb-4 text-2xl font-semibold">Why Practice With Us?</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="p-4 bg-white rounded-md shadow dark:bg-gray-800">
              <h3 className="mb-2 font-medium">24/7 Availability</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Practice speaking anytime, anywhere</p>
            </div>
            <div className="p-4 bg-white rounded-md shadow dark:bg-gray-800">
              <h3 className="mb-2 font-medium">Personalized Feedback</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get instant feedback on pronunciation and grammar</p>
            </div>
            <div className="p-4 bg-white rounded-md shadow dark:bg-gray-800">
              <h3 className="mb-2 font-medium">Track Progress</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your improvement over time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
