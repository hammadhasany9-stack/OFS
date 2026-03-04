"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Moon, Sun, LogOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrders } from '@/context/OrdersContext'
import { useUser, getUserInitials } from '@/context/UserContext'
import { clearAuthenticated } from '@/lib/auth'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', disabled: true },
  { href: '/single-site', label: 'Single Site', disabled: true },
  { href: '/direct-to-patient', label: 'Direct to Patient', disabled: false },
  { href: '/at-home', label: 'At-Home', disabled: true },
]

export function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isDark, setIsDark] = useState(false)
  const { orders, resetOrders } = useOrders()
  const { user } = useUser()
  const approvedCount = orders.filter(order => order.status === 'Approved').length

  const userName = `${user.firstName} ${user.lastName}`
  const userInitials = getUserInitials(user.firstName, user.lastName)

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    const isDarkMode = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogout = () => {
    clearAuthenticated('ofs')
    router.push('/login')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-sm dark:bg-zinc-950/95 dark:border-zinc-800/50 shadow-sm transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/direct-to-patient" className="flex items-center gap-3 group">
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
          <div className="flex items-center gap-1 ml-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              // Determine badge count based on the page
              let badgeCount: number | null = null
              if (link.href === '/direct-to-patient') {
                badgeCount = approvedCount
              } else if (link.href === '/single-site' || link.href === '/at-home') {
                badgeCount = 0
              }
              // Dashboard has no badge (badgeCount remains null)

              return link.disabled ? (
                <div
                  key={link.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg relative flex items-center gap-2",
                    "text-gray-400 dark:text-zinc-600 cursor-not-allowed opacity-60"
                  )}
                >
                  <span>{link.label}</span>
                  {badgeCount !== null && (
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "h-5 min-w-5 px-1.5 text-xs font-semibold",
                        "bg-gray-200 text-gray-400 dark:bg-zinc-800 dark:text-zinc-600"
                      )}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg relative flex items-center gap-2",
                    isActive
                      ? "text-primary bg-primary/10 dark:bg-primary/10 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <span>{link.label}</span>
                  {badgeCount !== null && (
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "h-5 min-w-5 px-1.5 text-xs font-semibold",
                        isActive 
                          ? "bg-primary text-white dark:bg-primary" 
                          : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {badgeCount}
                    </Badge>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-blue-500 rounded-t-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
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

          {/* Profile Avatar Dropdown */}
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
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
              <DropdownMenuLabel className="dark:text-zinc-200">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="dark:bg-zinc-800" />
              <DropdownMenuItem onClick={handleProfile} className="cursor-pointer dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:text-zinc-300">
                <div className="flex items-center">
                  <div className="h-4 w-4 mr-2 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                    <span className="text-[8px] font-semibold text-primary dark:text-primary">
                      {userInitials}
                    </span>
                  </div>
                  <span>Profile</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="dark:bg-zinc-800" />
              <DropdownMenuItem
                onClick={resetOrders}
                className="cursor-pointer dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:text-zinc-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span>Reset Demo Data</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800 dark:hover:text-red-400">
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
