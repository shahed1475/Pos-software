"use client"

import { Sidebar } from "./Sidebar"

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
        <Sidebar />
      </div>
    </>
  )
}
