"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AvatarDropdown from "./AvatarDropdown";
import { auth } from "@/firebase/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const navigationLinks = [
    { href: "/", label: "Home" },
    { href: "/talk-history", label: "History" },
    { href: "/dictionary", label: "Dictionary" },
    { href: "/notes", label: "Notes" },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between p-4 mx-auto max-w-7xl">
        {/* Logo and site name */}
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
            Talking Practice
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="items-center hidden space-x-1 md:flex">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActiveLink(link.href)
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User account section */}
        <div className="flex items-center space-x-4">
          {!loading && (
            user ? (
              <AvatarDropdown 
                userName={user.displayName || "User"} 
                userEmail={user.email || undefined}
                userImageUrl={user.photoURL || undefined}
              />
            ) : (
              <div className="hidden space-x-4 md:flex">
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600"
                >
                  Log in
                </Link>
                <Link 
                  href="/sign-up" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Sign up
                </Link>
              </div>
            )
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="inline-flex items-center justify-center p-2 text-gray-400 rounded-md hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
          >
            <span className="sr-only">Open main menu</span>
            {isMobileMenuOpen ? (
              <X className="block w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="block w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActiveLink(link.href)
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 text-base font-medium text-blue-600 rounded-md hover:bg-gray-50 dark:text-blue-400 dark:hover:bg-gray-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/sign-up"
                  className="block px-3 py-2 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 