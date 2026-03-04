export type AuthSection = "ofs" | "printroom" | "production"

const AUTH_KEYS: Record<AuthSection, string> = {
  ofs: "medzah_ofs_auth",
  printroom: "medzah_printroom_auth",
  production: "medzah_production_auth",
}

const MFA_PENDING_KEY = "medzah_mfa_pending"

export const SECTION_LABELS: Record<AuthSection, string> = {
  ofs: "Order Fulfillment System",
  printroom: "DTP Print Room",
  production: "Production Team",
}

export const SECTION_LOGIN_PATHS: Record<AuthSection, string> = {
  ofs: "/login",
  printroom: "/dtp-printroom/login",
  production: "/production-team/login",
}

export function setAuthenticated(section: AuthSection): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_KEYS[section], "true")
  }
}

export function clearAuthenticated(section: AuthSection): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEYS[section])
  }
}

export function checkAuthenticated(section: AuthSection): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_KEYS[section]) === "true"
}

export function setMfaPending(section: AuthSection, email: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(MFA_PENDING_KEY, JSON.stringify({ section, email }))
  }
}

export function getMfaPending(): { section: AuthSection; email: string } | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(MFA_PENDING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearMfaPending(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(MFA_PENDING_KEY)
  }
}
