"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type AuthSection, setMfaPending, SECTION_LABELS } from "@/lib/auth"

interface LoginFormProps {
  section: AuthSection
  mfaPath: string
}

export function LoginForm({ section, mfaPath }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem("theme")
    const isDarkMode =
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(isDarkMode)
    if (isDarkMode) document.documentElement.classList.add("dark")
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (!password) {
      setError("Please enter your password.")
      return
    }

    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setIsLoading(false)

    setMfaPending(section, email)
    router.push(mfaPath)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 flex flex-col items-center justify-center p-4 transition-colors duration-200">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 rounded-lg bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-800 shadow-sm border border-gray-200 dark:border-zinc-700"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-zinc-400" />
          ) : (
            <Moon className="h-4 w-4 text-gray-500" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <div className="w-full max-w-[420px]">
        {/* Logo + section badge */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative h-14 w-20">
            <Image
              src="/md-ditek-logo.png"
              alt="MD Ditek Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-primary px-3 py-1 bg-primary/8 dark:bg-primary/10 rounded-full border border-primary/20">
            {SECTION_LABELS[section]}
          </span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl dark:shadow-zinc-950/60 border border-gray-100 dark:border-zinc-800 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@medzah.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError("")
                }}
                className="h-11 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  className="h-11 pr-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center pt-1">
              <Link
                href={`/forgot-password?section=${section}`}
                className="text-sm text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-6">
          © {new Date().getFullYear()} MD Ditek · Order Fulfillment System
        </p>
      </div>
    </div>
  )
}
