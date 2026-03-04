"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

const STORAGE_KEY = "medzah_ofs_user"

export interface UserData {
  firstName: string
  lastName: string
  email: string
  password: string
}

const DEFAULT_USER: UserData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@medzah.com",
  password: "password123",
}

function migrateUser(data: UserData): UserData {
  // Replace legacy example.com domain with medzah.com
  if (data.email.endsWith("@example.com")) {
    return { ...data, email: data.email.replace("@example.com", "@medzah.com") }
  }
  return data
}

function loadUser(): UserData {
  if (typeof window === "undefined") return DEFAULT_USER
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_USER
    const parsed = JSON.parse(raw)
    if (!parsed.firstName || !parsed.lastName || !parsed.email || !parsed.password) {
      return DEFAULT_USER
    }
    return migrateUser(parsed as UserData)
  } catch {
    return DEFAULT_USER
  }
}

interface UserContextValue {
  user: UserData
  updatePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string }
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData>(DEFAULT_USER)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setUser(loadUser())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    }
  }, [user, hydrated])

  const updatePassword = useCallback(
    (currentPassword: string, newPassword: string): { success: boolean; error?: string } => {
      if (currentPassword !== user.password) {
        return { success: false, error: "Current password is incorrect." }
      }
      if (newPassword.length < 8) {
        return { success: false, error: "New password must be at least 8 characters." }
      }
      if (!/[A-Z]/.test(newPassword)) {
        return { success: false, error: "New password must contain at least 1 uppercase letter." }
      }
      if (!/[0-9]/.test(newPassword)) {
        return { success: false, error: "New password must contain at least 1 number." }
      }
      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        return { success: false, error: "New password must contain at least 1 special character." }
      }
      setUser((prev) => ({ ...prev, password: newPassword }))
      return { success: true }
    },
    [user.password]
  )

  return (
    <UserContext.Provider value={{ user, updatePassword }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}

export function getUserInitials(firstName: string, lastName: string): string {
  const f = firstName.trim()
  const l = lastName.trim()
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
  if (f) return f.substring(0, 2).toUpperCase()
  return "??"
}
