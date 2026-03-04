"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { checkAuthenticated, clearAuthenticated } from "@/lib/auth"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowRight, Moon, Sun, Info, LogOut } from "lucide-react"
import { useUser, getUserInitials } from "@/context/UserContext"

function getGreeting(firstName: string) {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${firstName}!`
  if (hour < 17) return `Good afternoon, ${firstName}!`
  return `Good evening, ${firstName}!`
}

const PROGRAMS = [
  { value: "single-site", label: "Single Site", disabled: true },
  { value: "direct-to-patient", label: "Direct to Patient", disabled: false },
  { value: "at-home", label: "At-Home", disabled: true },
]

const LINES = [
  { value: "1", label: "Line 1" },
  { value: "2", label: "Line 2" },
  { value: "3", label: "Line 3" },
  { value: "4", label: "Line 4" },
  { value: "5", label: "Line 5" },
  { value: "6", label: "Line 6" },
]

const STATIONS = [
  { value: "production", label: "Production (Station 1)" },
  { value: "quality-control", label: "Quality Control (Station 2)" },
]

export default function ProductionTeamPage() {
  const router = useRouter()
  const { user } = useUser()
  const [program, setProgram] = useState("")
  const [line, setLine] = useState("")
  const [station, setStation] = useState("")
  const [isDark, setIsDark] = useState(false)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!checkAuthenticated("production")) {
      router.replace("/production-team/login")
      return
    }
    setAuthReady(true)
  }, [router])

  useEffect(() => {
    if (!authReady) return
    const theme = localStorage.getItem("theme")
    const isDarkMode =
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    }

    const savedProgram = sessionStorage.getItem("pt_program")
    const savedLine = sessionStorage.getItem("pt_line")
    const savedStation = sessionStorage.getItem("pt_station")
    if (savedProgram) setProgram(savedProgram)
    if (savedLine) setLine(savedLine)
    if (savedStation) setStation(savedStation)
  }, [authReady])

  const handleProgramChange = (value: string) => {
    setProgram(value)
    sessionStorage.setItem("pt_program", value)
  }

  const handleLineChange = (value: string) => {
    setLine(value)
    sessionStorage.setItem("pt_line", value)
  }

  const handleStationChange = (value: string) => {
    setStation(value)
    sessionStorage.setItem("pt_station", value)
  }

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

  if (!authReady) return <div className="min-h-screen bg-background" />

  const canNavigate = program !== "" && line !== "" && station !== ""

  const handleGo = () => {
    if (!canNavigate) return
    router.push(`/${station}/${program}/${line}`)
  }

  const handleLogout = () => {
    clearAuthenticated("production")
    router.push("/production-team/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col transition-colors duration-200">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
        <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-16">
              <Image
                src="/md-ditek-logo.png"
                alt="MD Ditek Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-gray-700 dark:text-zinc-300 tracking-tight">
              Production Team
            </span>
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
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center ring-2 ring-primary/10 dark:ring-primary/20 hover:ring-primary/20 dark:hover:ring-primary/30 transition-all">
                    <span className="text-xs font-semibold text-white">
                      {getUserInitials(user.firstName, user.lastName)}
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
                    <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => router.push("/profile")}
                  className="cursor-pointer dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:text-zinc-300"
                >
                  <div className="h-4 w-4 mr-2 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-primary">
                      {getUserInitials(user.firstName, user.lastName)}
                    </span>
                  </div>
                  <span>Profile</span>
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

      {/* Page body */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-4">
        {/* Greeting */}
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {getGreeting(user.firstName)}
          </p>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-zinc-400">
            Ready to start your shift? Make your selections below and head to your station.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl dark:shadow-zinc-950/50 border border-gray-200 dark:border-zinc-800 p-8">
          <div className="mb-6 text-center">
            <h2 className="text-base font-semibold text-gray-700 dark:text-zinc-300 tracking-tight">
              Select your station
            </h2>
          </div>

          <div className="space-y-5">
            {/* Select Program */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Select Program
              </label>
              <Select value={program} onValueChange={handleProgramChange}>
                <SelectTrigger className="w-full h-11 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                  <SelectValue placeholder="Choose a program…" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                  {PROGRAMS.map((p) => (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      disabled={p.disabled}
                      className="dark:text-zinc-200 dark:focus:bg-zinc-800 data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Line */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Select Line
              </label>
              <Select value={line} onValueChange={handleLineChange}>
                <SelectTrigger className="w-full h-11 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                  <SelectValue placeholder="Choose a line…" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                  {LINES.map((l) => (
                    <SelectItem
                      key={l.value}
                      value={l.value}
                      className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                    >
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Station */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Select Station
              </label>
              <Select value={station} onValueChange={handleStationChange}>
                <SelectTrigger className="w-full h-11 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200">
                  <SelectValue placeholder="Choose a station…" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-700">
                  {STATIONS.map((s) => (
                    <SelectItem
                      key={s.value}
                      value={s.value}
                      className="dark:text-zinc-200 dark:focus:bg-zinc-800"
                    >
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Review summary */}
            {canNavigate && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/10 px-4 py-3 flex gap-3">
                <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300 space-y-0.5">
                  <p className="font-semibold mb-1">Review your selection</p>
                  <p>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Program: </span>
                    {PROGRAMS.find((p) => p.value === program)?.label}
                  </p>
                  <p>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Line: </span>
                    {LINES.find((l) => l.value === line)?.label}
                  </p>
                  <p>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Station: </span>
                    {STATIONS.find((s) => s.value === station)?.label}
                  </p>
                </div>
              </div>
            )}

            {/* Go Button */}
            <Button
              onClick={handleGo}
              disabled={!canNavigate}
              className="w-full h-11 mt-2 gap-2 text-sm font-semibold"
            >
              Go to Station
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
