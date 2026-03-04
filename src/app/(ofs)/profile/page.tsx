"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, User, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser, getUserInitials } from "@/context/UserContext"

const PASSWORD_RULES = [
  { id: "length",    label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "At least 1 uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "number",    label: "At least 1 number",           test: (p: string) => /[0-9]/.test(p) },
  { id: "special",   label: "At least 1 special character",test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function ProfilePage() {
  const router = useRouter()
  const { user, updatePassword } = useUser()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(newPassword) })),
    [newPassword]
  )
  const allRulesPassed = ruleResults.every((r) => r.passed)

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setFormMessage(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormMessage({ type: "error", text: "All password fields are required." })
      return
    }
    if (!allRulesPassed) {
      setFormMessage({ type: "error", text: "New password does not meet all the requirements." })
      return
    }
    if (newPassword !== confirmPassword) {
      setFormMessage({ type: "error", text: "New password and confirmation do not match." })
      return
    }
    if (newPassword === currentPassword) {
      setFormMessage({ type: "error", text: "New password must be different from the current password." })
      return
    }

    setIsSubmitting(true)
    const result = updatePassword(currentPassword, newPassword)
    setIsSubmitting(false)

      if (result.success) {
      setFormMessage({ type: "success", text: "Password updated successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setFormMessage({ type: "error", text: result.error ?? "Failed to update password." })
    }
  }

  const initials = getUserInitials(user.firstName, user.lastName)
  const fullName = `${user.firstName} ${user.lastName}`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        {/* Avatar + name header */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/80 dark:from-primary dark:to-primary/90 flex items-center justify-center ring-4 ring-primary/10 dark:ring-primary/20 mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{fullName}</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{user.email}</p>
        </div>

        {/* Personal Information card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-6 overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="h-7 w-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Personal Information</h2>
            <span className="ml-auto flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 font-medium">
              <Lock className="h-3 w-3" />
              Read only
            </span>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* First Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                First Name
              </label>
              <div className="relative">
                <Input
                  value={user.firstName}
                  readOnly
                  disabled
                  className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 pr-9 cursor-not-allowed select-none"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Last Name
              </label>
              <div className="relative">
                <Input
                  value={user.lastName}
                  readOnly
                  disabled
                  className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 pr-9 cursor-not-allowed select-none"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-600 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Email
              </label>
              <div className="relative">
                <Input
                  value={user.email}
                  readOnly
                  disabled
                  className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 pr-9 cursor-not-allowed select-none"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-zinc-600 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Change Password card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="h-7 w-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Change Password</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="px-6 py-5 space-y-5">

            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Current Password
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password rules checklist — always visible, checks off live as the user types */}
              <div className="mt-2 rounded-lg border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 px-4 py-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ruleResults.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2">
                    {rule.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500 dark:text-green-400 transition-colors" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-zinc-600 transition-colors" />
                    )}
                    <span
                      className={`text-xs font-medium transition-colors ${
                        rule.passed
                          ? "text-green-700 dark:text-green-400"
                          : "text-gray-400 dark:text-zinc-500"
                      }`}
                    >
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Inline message */}
            {formMessage && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
                  formMessage.type === "success"
                    ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800/40 dark:bg-green-900/10 dark:text-green-400"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-400"
                }`}
              >
                {formMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{formMessage.text}</span>
              </div>
            )}

            {/* Submit */}
            <div className="pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}
