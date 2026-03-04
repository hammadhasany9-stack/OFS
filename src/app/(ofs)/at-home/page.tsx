import { PageHeader } from "@/components/layout/PageHeader"

export default function AtHomePage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        <PageHeader 
          title="At-Home" 
          subtitle="Manage at-home test kit orders"
        />
        <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-12 text-center shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-zinc-400 text-lg">At-Home content coming soon...</p>
        </div>
      </div>
    </div>
  )
}
