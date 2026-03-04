"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldCheck, Moon, Sun, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  type AuthSection,
  getMfaPending,
  clearMfaPending,
  setAuthenticated,
  SECTION_LABELS,
  SECTION_LOGIN_PATHS,
} from "@/lib/auth"

const DEMO_OTP = "123456"

interface MfaFormProps {
  section: AuthSection
  redirectTo: string
}

export function MfaForm({ section, redirectTo }: MfaFormProps) {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isDark, setIsDark] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const pending = getMfaPending()
    if (!pending || pending.section !== section) {
      router.replace(SECTION_LOGIN_PATHS[section])
      return
    }
    setEmail(pending.email)

    const theme = localStorage.getItem("theme")
    const isDarkMode =
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(isDarkMode)
    if (isDarkMode) document.documentElement.classList.add("dark")

    inputRefs.current[0]?.focus()
  }, [router, section])

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

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(-1)
    setError("")
    const next = [...digits]
    next[index] = cleaned
    setDigits(next)
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ""
        setDigits(next)
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus()
        const next = [...digits]
        next[index - 1] = ""
        setDigits(next)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill("")
    pasted.split("").forEach((ch, i) => {
      next[i] = ch
    })
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  const otp = digits.join("")

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError("Please enter all 6 digits.")
      return
    }
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    setIsLoading(false)

    if (otp !== DEMO_OTP) {
      setError("Incorrect code. Please try again.")
      setDigits(Array(6).fill(""))
      inputRefs.current[0]?.focus()
      return
    }

    setAuthenticated(section)
    clearMfaPending()
    router.replace(redirectTo)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleVerify()
  }

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "•") + c)
    : ""

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
        {/* Logo */}
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
          <div className="flex flex-col items-center mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight text-center">
              Two-factor verification
            </h1>
            {maskedEmail && (
              <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400 text-center">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-gray-700 dark:text-zinc-300">
                  {maskedEmail}
                </span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP input grid */}
            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-12 w-10 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center text-lg font-bold text-gray-900 dark:text-white caret-transparent outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:border-primary transition-all duration-150"
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2.5 text-center">
                {error}
              </p>
            )}

            {/* Demo hint */}
            <p className="text-xs text-center text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-800/50 rounded-lg px-3 py-2 border border-gray-100 dark:border-zinc-700/50">
              Prototype demo — use code{" "}
              <span className="font-semibold text-gray-600 dark:text-zinc-300 tracking-widest">
                {DEMO_OTP}
              </span>
            </p>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold"
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="text-center">
              <Link
                href={SECTION_LOGIN_PATHS[section]}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
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
