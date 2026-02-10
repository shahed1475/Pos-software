"use client"

import { useSession } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        {session?.user && (
          <div className="flex items-center gap-2 ml-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {session.user.name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{session.user.name}</p>
              <Badge variant="secondary" className="text-xs">
                {session.user.role}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
