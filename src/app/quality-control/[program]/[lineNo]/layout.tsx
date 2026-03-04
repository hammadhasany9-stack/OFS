"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProductionTopNav } from "@/components/layout/ProductionTopNav"
import { NavGuardProvider } from "@/context/NavGuardContext"
import { checkAuthenticated } from "@/lib/auth"

export default function QualityControlLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!checkAuthenticated("production")) {
      router.replace("/production-team/login")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return <div className="min-h-screen bg-background" />

  return (
    <NavGuardProvider>
      <ProductionTopNav />
      <main className="min-h-screen">{children}</main>
    </NavGuardProvider>
  )
}
