"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Sparkles } from "lucide-react"
import { queueApiRequest } from "@/lib/offline-queue"

export default function InsightsPage() {
  const [insights, setInsights] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchInsights()
  }, [])

  async function fetchInsights() {
    const res = await fetch("/api/ai/insights?limit=20")
    if (res.ok) setInsights(await res.json())
  }

  async function generateInsight() {
    setGenerating(true)
    const res = await queueApiRequest("/api/ai/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.status === 202) {
      toast({ title: "Offline: request queued for sync" })
    } else if (res.ok) {
      toast({ title: "Insight generated" })
      fetchInsights()
    } else {
      toast({ title: "Failed to generate", variant: "destructive" })
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">Auto-generated business intelligence</p>
        </div>
        <Button onClick={generateInsight} disabled={generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? "Generating..." : "Generate Today's Insight"}
        </Button>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{insight.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{insight.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(insight.generatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{insight.summary}</p>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {insight.content.split("\n").map((line: string, idx: number) => {
                  if (line.startsWith("# ")) return <h2 key={idx} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h2>
                  if (line.startsWith("## ")) return <h3 key={idx} className="text-lg font-semibold mt-3 mb-1">{line.slice(3)}</h3>
                  if (line.startsWith("- ")) return <p key={idx} className="ml-4 text-sm">{line}</p>
                  if (line.trim() === "") return <br key={idx} />
                  return <p key={idx} className="text-sm">{line}</p>
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {insights.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4" />
              <p>No insights generated yet.</p>
              <p className="text-sm">Click &quot;Generate Today&apos;s Insight&quot; to create your first one.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
