"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RefreshCw } from "lucide-react"

interface AggregationJob {
  id: string
  type: string
  dateFrom: string
  dateTo: string
  status: string
  error?: string
  triggeredBy?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

interface AggregationPanelProps {
  jobs: AggregationJob[]
  onRefresh: () => void
}

const STATUS_STYLES: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COMPLETED: "default",
  RUNNING: "secondary",
  PENDING: "outline",
  FAILED: "destructive",
}

export function AggregationPanel({ jobs, onRefresh }: AggregationPanelProps) {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split("T")[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function runAggregation() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch("/api/aggregation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom, dateTo }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(`Aggregation ${data.status} (Job: ${data.jobId})`)
        onRefresh()
      } else {
        setResult(`Error: ${data.error || "Failed"}`)
      }
    } catch {
      setResult("Error: Network request failed")
    } finally {
      setRunning(false)
    }
  }

  const lastCompleted = jobs.find((j) => j.status === "COMPLETED")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Aggregation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastCompleted && (
            <p className="text-sm text-muted-foreground">
              Last aggregation: {lastCompleted.dateTo} ({new Date(lastCompleted.completedAt || lastCompleted.createdAt).toLocaleString()})
            </p>
          )}
          <div className="flex items-end gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={runAggregation} disabled={running}>
              <RefreshCw className={`mr-2 h-4 w-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Running..." : "Run Aggregation"}
            </Button>
          </div>
          {result && (
            <p className={`text-sm ${result.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>
              {result}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job History</CardTitle>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No aggregation jobs yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.type}</TableCell>
                      <TableCell>{job.dateFrom} to {job.dateTo}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_STYLES[job.status] || "outline"}>{job.status}</Badge>
                        {job.error && <p className="text-xs text-red-500 mt-1">{job.error}</p>}
                      </TableCell>
                      <TableCell>{job.triggeredBy || "-"}</TableCell>
                      <TableCell>
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
