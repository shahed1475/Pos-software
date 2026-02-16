"use client"

import { Badge } from "@/components/ui/badge"

const CLASS_COLORS: Record<string, string> = {
  STAR: "bg-yellow-100 text-yellow-800",
  PUZZLE: "bg-purple-100 text-purple-800",
  PLOWHORSE: "bg-blue-100 text-blue-800",
  DOG: "bg-red-100 text-red-800",
}

const CLASS_DESCRIPTIONS: Record<string, string> = {
  STAR: "High popularity + High profit",
  PUZZLE: "Low popularity + High profit",
  PLOWHORSE: "High popularity + Low profit",
  DOG: "Low popularity + Low profit",
}

interface Props {
  items: Array<{
    id: string
    name: string
    classification: string
    totalSold: number
    marginPercent: number
    totalRevenue: number
  }>
}

export function MenuEngineeringMatrix({ items }: Props) {
  const maxSold = Math.max(...items.map((i) => i.totalSold), 1)
  const maxMargin = Math.max(...items.map((i) => i.marginPercent), 1)

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        {["STAR", "PUZZLE", "PLOWHORSE", "DOG"].map((cls) => (
          <div key={cls} className="flex items-center gap-2">
            <Badge className={CLASS_COLORS[cls]}>{cls}</Badge>
            <span className="text-xs text-muted-foreground">{CLASS_DESCRIPTIONS[cls]}</span>
          </div>
        ))}
      </div>

      {/* Simple scatter representation */}
      <div className="relative bg-gray-50 border rounded-lg p-4 h-80">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
          Margin %
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          Popularity (units sold)
        </div>

        {/* Quadrant lines */}
        <div className="absolute left-1/2 top-4 bottom-8 w-px bg-gray-300" />
        <div className="absolute top-1/2 left-8 right-4 h-px bg-gray-300" />

        {/* Quadrant labels */}
        <div className="absolute left-10 top-6 text-[10px] text-purple-500 font-medium">PUZZLE</div>
        <div className="absolute right-6 top-6 text-[10px] text-yellow-600 font-medium">STAR</div>
        <div className="absolute left-10 bottom-10 text-[10px] text-red-500 font-medium">DOG</div>
        <div className="absolute right-6 bottom-10 text-[10px] text-blue-500 font-medium">PLOWHORSE</div>

        {/* Data points */}
        {items.map((item) => {
          const x = 8 + (item.totalSold / maxSold) * 80
          const y = 8 + (1 - item.marginPercent / maxMargin) * 80

          return (
            <div
              key={item.id}
              className={`absolute w-3 h-3 rounded-full cursor-pointer ${
                item.classification === "STAR" ? "bg-yellow-500" :
                item.classification === "PUZZLE" ? "bg-purple-500" :
                item.classification === "PLOWHORSE" ? "bg-blue-500" :
                "bg-red-500"
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${item.name}: ${item.totalSold} sold, ${item.marginPercent.toFixed(0)}% margin`}
            />
          )
        })}
      </div>
    </div>
  )
}
