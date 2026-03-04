"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Moon, Sun, LogOut, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavGuard } from "@/context/NavGuardContext"
import { useRouter } from "next/navigation"
import { useUser, getUserInitials } from "@/context/UserContext"
import { clearAuthenticated } from "@/lib/auth"

export function ProductionTopNav() {
  const [isDark, setIsDark] = useState(false)
  const { guard } = useNavGuard()
  const router = useRouter()
  const { user } = useUser()

  const userName = `${user.firstName} ${user.lastName}`
  const userInitials = getUserInitials(user.firstName, user.lastName)

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    const isDarkMode =
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleLogout = () => {
    clearAuthenticated("production")
    router.push("/production-team/login")
  }

  const handleProfile = () => {
    router.push("/profile")
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-6">
          <Link href="/production-team" className="flex items-center gap-3 group">
            <div className="relative h-12 w-16 transition-transform group-hover:scale-105">
              <Image
                src="/md-ditek-logo.png"
                alt="MD Ditek Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {guard ? (
            <button
              onClick={guard}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workstation
            </button>
          ) : (
            <Link
              href="/production-team"
              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Workstation
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-all duration-200"
          >
            {isDark ? (
              <Sun className="h-[1.15rem] w-[1.15rem] text-zinc-400 hover:text-zinc-100 transition-colors" />
            ) : (
              <Moon className="h-[1.15rem] w-[1.15rem] text-gray-600 hover:text-gray-900 transition-colors" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 w-9 rounded-full p-0 hover:scale-105 transition-all duration-200"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 dark:from-primary dark:to-primary/90 flex items-center justify-center ring-2 ring-primary/10 dark:ring-primary/20 hover:ring-primary/20 dark:hover:ring-primary/30 transition-all">
                  <span className="text-xs font-semibold text-white">
                    {userInitials}
                  </span>
                </div>
                <span className="sr-only">Open user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
            >
              <DropdownMenuLabel className="dark:text-zinc-200">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-zinc-800" />
              <DropdownMenuItem
                onClick={handleProfile}
                className="cursor-pointer dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:text-zinc-300"
              >
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-primary dark:text-primary">
                      {userInitials}
                    </span>
                  </div>
                  <span>Profile</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 dark:text-red-400 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:hover:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}
