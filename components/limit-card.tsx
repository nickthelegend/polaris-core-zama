"use client"

import useSWR from "swr"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LimitCard() {
  const { data } = useSWR("/api/limits", fetcher, { refreshInterval: 15_000 })
  const total = data?.currentLimit ?? 200
  const used = data?.used ?? 32
  const available = Math.max(0, total - used)
  const pct = Math.min(100, Math.round((used / total) * 100))

  return (
    <Card className="bg-card/40 border border-border/40 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-sm text-foreground/80">Spending Limit</div>
          <Link href="/limits">
            <Button size="sm" className="rounded-full">
              Increase
            </Button>
          </Link>
        </div>

        <div className="mt-3 text-4xl font-bold text-balance">
          ${available.toFixed(2)} <span className="text-lg align-middle text-foreground/70">available</span>
        </div>
        <div className="text-sm text-foreground/70">of ${total.toFixed(2)} total</div>

        <div className="mt-4">
          <div className="h-3 rounded-full bg-primary/10 border border-primary/20 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} aria-label="Used percentage" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-foreground/70">
            <span>Used ${used.toFixed(2)}</span>
            <span>{pct}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
