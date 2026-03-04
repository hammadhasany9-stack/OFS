"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PrintRoomTopNav } from "@/components/layout/PrintRoomTopNav"
import { checkAuthenticated } from "@/lib/auth"

export default function PrintRoomLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!checkAuthenticated("printroom")) {
      router.replace("/dtp-printroom/login")
    } else {
      setReady(true)
    }
  }, [router])

  if (!ready) return <div className="min-h-screen bg-background" />

  return (
    <>
      <PrintRoomTopNav />
      <main className="min-h-screen">{children}</main>
    </>
  )
}
