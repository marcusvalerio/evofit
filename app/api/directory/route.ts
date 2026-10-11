import { dbConfigured } from "@/lib/server/db"
import { publicProfiles } from "@/lib/server/directory"
import { handle } from "@/lib/server/http"
import { NextResponse } from "next/server"

export const GET = handle(async () => {
  const profiles = dbConfigured() ? await publicProfiles() : []
  return NextResponse.json({ profiles }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } })
})
