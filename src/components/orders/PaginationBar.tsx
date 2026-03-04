"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  totalOrders: number
}

export function PaginationBar({ 
  currentPage, 
  totalPages, 
  totalOrders 
}: PaginationBarProps) {
  const ordersPerPage = 10
  const startOrder = (currentPage - 1) * ordersPerPage + 1
  const endOrder = Math.min(currentPage * ordersPerPage, totalOrders)

  return (
    <div className="flex items-center justify-between px-8 rounded-lg border bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 shadow-sm transition-colors">
      <div className="text-sm text-muted-foreground dark:text-zinc-400 font-medium whitespace-nowrap">
        Showing <span className="text-foreground dark:text-zinc-200 font-semibold">{startOrder}-{endOrder}</span> of <span className="text-foreground dark:text-zinc-200 font-semibold">{totalOrders}</span> orders
      </div>

      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer dark:hover:bg-zinc-800 dark:text-zinc-300"}
            />
          </PaginationItem>
          
          {Array.from({ length: Math.min(totalPages || 1, 5) }, (_, i) => i + 1).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink 
                href="#" 
                isActive={page === currentPage}
                className="cursor-pointer dark:hover:bg-zinc-800 dark:text-zinc-300 dark:data-[active]:bg-primary dark:data-[active]:text-white"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {totalPages > 5 && (
            <PaginationItem>
              <PaginationEllipsis className="dark:text-zinc-500" />
            </PaginationItem>
          )}
          
          <PaginationItem>
            <PaginationNext 
              href="#"
              className={currentPage === (totalPages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer dark:hover:bg-zinc-800 dark:text-zinc-300"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
