interface PageHeaderProps {
  title: string
  subtitle?: string
  subtitleBadge?: boolean
  subtitleBadgeClassName?: string
  subtext?: string
}

export function PageHeader({ title, subtitle, subtitleBadge = false, subtitleBadgeClassName, subtext }: PageHeaderProps) {
  const badgeClass = subtitleBadgeClassName
    ?? "border-gray-300 bg-gray-100 text-gray-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"

  return (
    <div className="mb-8">
      {subtitle && subtitleBadge && (
        <span className={`inline-flex items-center mb-3 rounded-full border px-3 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {subtitle}
        </span>
      )}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {subtitle && !subtitleBadge && (
        <p className="mt-2 text-base text-gray-600 dark:text-zinc-400">{subtitle}</p>
      )}
      {subtext && (
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">{subtext}</p>
      )}
    </div>
  )
}
