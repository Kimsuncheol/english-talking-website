"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  destination?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";
  className?: string;
}

export default function BackButton({
  destination = "/",
  label = "",
  variant = "primary",
  size = "medium",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (destination) {
      router.push(destination);
    } else {
      router.back();
    }
  };

  // Base classes
  const baseClasses = "inline-flex items-center transition-all duration-200 font-medium rounded-lg";
  
  // Size classes
  const sizeClasses = {
    small: "text-xs  py-1.5 gap-1",
    medium: "text-sm  py-2 gap-1.5",
    large: "text-base  py-2.5 gap-2",
    // small: "text-xs px-2.5 py-1.5 gap-1",
    // medium: "text-sm px-3.5 py-2 gap-1.5",
    // large: "text-base px-5 py-2.5 gap-2",
  };
  
  // Variant classes
  const variantClasses = {
    primary: "bg-transparent text-gray-700 dark:text-gray-300",
    secondary: "bg-transparent text-gray-700 dark:text-gray-300",
    ghost: "bg-transparent text-gray-700 dark:text-gray-300",
    // primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800",
    // secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-4 focus:ring-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:focus:ring-gray-700",
    // ghost: "bg-transparent hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700",
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button onClick={handleBack} className={classes}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={`${size === "small" ? "w-4 h-4" : size === "medium" ? "w-5 h-5" : "w-6 h-6"} transform transition-transform group-hover:-translate-x-1`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {label}
    </button>
  );
}
