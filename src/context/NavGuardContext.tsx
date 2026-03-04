"use client"

import { createContext, useContext, useState, ReactNode, useCallback } from "react"

interface NavGuardContextValue {
  /** A callback registered by a page that wants to intercept back-navigation.
   *  The nav calls this instead of navigating when it is set. */
  guard: (() => void) | null
  setGuard: (fn: (() => void) | null) => void
}

const NavGuardContext = createContext<NavGuardContextValue | null>(null)

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const [guard, setGuardState] = useState<(() => void) | null>(null)

  // Wrap in useCallback so the reference is stable and avoids re-render loops
  const setGuard = useCallback((fn: (() => void) | null) => {
    // useState setter treats functions specially (calls them as updaters),
    // so we wrap in an arrow function to store the callback as a value.
    setGuardState(fn ? () => fn : null)
  }, [])

  return (
    <NavGuardContext.Provider value={{ guard, setGuard }}>
      {children}
    </NavGuardContext.Provider>
  )
}

export function useNavGuard() {
  const ctx = useContext(NavGuardContext)
  if (!ctx) throw new Error("useNavGuard must be used within NavGuardProvider")
  return ctx
}
