import { PageHeader } from "@/components/layout/PageHeader"

export default function SingleSitePage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950">
      <div className="container mx-auto py-8 px-6 max-w-[1600px]">
        <PageHeader 
          title="Single Site" 
          subtitle="Manage single site order fulfillment"
        />
        <div className="rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-12 text-center shadow-sm transition-colors">
          <p className="text-gray-500 dark:text-zinc-400 text-lg">Single Site content coming soon...</p>
        </div>
      </div>
    </div>
  )
}
