"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TopNav } from "@/components/layout/TopNav"
import { checkAuthenticated } from "@/lib/auth"

export default function OfsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!checkAuthenticated("ofs")) {
      router.replace("/login")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return <div className="min-h-screen bg-background" />

  return (
    <>
      <TopNav />
      <main className="min-h-screen">{children}</main>
    </>
  )
}
