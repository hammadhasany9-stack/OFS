import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { OrdersProvider } from "@/context/OrdersContext"
import { UserProvider } from "@/context/UserContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Medzah Order Fulfillment System",
  description: "Manage and track patient kit orders from LabCorp",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <UserProvider>
          <OrdersProvider>
            {children}
          </OrdersProvider>
        </UserProvider>
      </body>
    </html>
  )
}
