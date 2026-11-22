import { healthCheck } from "@/lib/server/monitor"
import { dbConfigured } from "@/lib/server/db"
import { NextResponse } from "next/server"

/** Para monitores de disponibilidade (ex.: UptimeRobot): 200 = no ar; 503 = banco fora. */
export async function GET() {
  const h = dbConfigured() ? await healthCheck() : { ok: true, db: "demo", ms: 0 }
  return NextResponse.json(h, { status: h.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
