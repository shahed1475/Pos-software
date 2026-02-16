"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User } from "lucide-react"
import { queueApiRequest } from "@/lib/offline-queue"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your business assistant. Ask me about your revenue, orders, vendors, inventory, menu, staff, or get suggestions for improvement.",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await queueApiRequest("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })

      if (res.status === 202) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "You are offline. This message was queued and will sync automatically." },
        ])
      } else if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }])
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that request." }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Owner AI</h1>
        <p className="text-muted-foreground">Ask questions about your business performance</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}>
                <div className="whitespace-pre-wrap text-sm">
                  {msg.content.split("\n").map((line, i) => {
                    // Simple markdown rendering for bold
                    const parts = line.split(/(\*\*[^*]+\*\*)/g)
                    return (
                      <p key={i} className={i > 0 ? "mt-1" : ""}>
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**")
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    )
                  })}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t p-4">
          <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your business..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Read-only access to your business data. Try: &quot;How are sales today?&quot; or &quot;Show inventory status&quot;
          </p>
        </div>
      </Card>
    </div>
  )
}
