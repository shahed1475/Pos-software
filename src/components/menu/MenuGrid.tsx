"use client"

import { MenuItemCard } from "./MenuItemCard"

interface MenuGridProps {
  items: any[]
  onEdit?: (item: any) => void
  onDelete?: (item: any) => void
  onClick?: (item: any) => void
  showActions?: boolean
}

export function MenuGrid({ items, onEdit, onDelete, onClick, showActions = true }: MenuGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No menu items found
      </div>
    )
  }

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          onEdit={() => onEdit?.(item)}
          onDelete={() => onDelete?.(item)}
          onClick={onClick ? () => onClick(item) : undefined}
          showActions={showActions}
        />
      ))}
    </div>
  )
}
