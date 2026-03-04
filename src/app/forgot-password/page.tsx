"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { type AuthSection } from "@/lib/auth"

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const raw = searchParams.get("section")
  const section: AuthSection =
    raw === "printroom" || raw === "production" ? raw : "ofs"

  return <ForgotPasswordForm section={section} />
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordContent />
    </Suspense>
  )
}
