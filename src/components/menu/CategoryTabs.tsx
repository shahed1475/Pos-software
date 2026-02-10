"use client"

import { cn } from "@/lib/utils"

interface Category {
  id: string
  name: string
  _count?: { items: number }
}

interface CategoryTabsProps {
  categories: Category[]
  activeCategory: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategoryTabs({ categories, activeCategory, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
          activeCategory === null
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        All Items
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            activeCategory === category.id
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {category.name}
          {category._count && (
            <span className="ml-1 text-xs opacity-70">({category._count.items})</span>
          )}
        </button>
      ))}
    </div>
  )
}
