"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface MenuItemCardProps {
  item: {
    id: string
    name: string
    description?: string | null
    price: number
    image?: string | null
    available: boolean
    category: { name: string }
    variants?: { id: string; name: string; priceAdj: number }[]
  }
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
  showActions?: boolean
}

export function MenuItemCard({ item, onEdit, onDelete, onClick, showActions = true }: MenuItemCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${
        !item.available ? "opacity-60" : ""
      }`}
      onClick={onClick}
    >
      <div className="aspect-video bg-muted flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">🍽️</span>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {formatCurrency(item.price)}
              </span>
              {!item.available && (
                <Badge variant="destructive" className="text-xs">
                  Unavailable
                </Badge>
              )}
            </div>
          </div>
          {showActions && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit?.() }}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete?.() }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
