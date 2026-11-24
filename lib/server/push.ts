import * as webpush from "web-push"
import { getDb, type Db } from "./db"

/** Notificações push (Web Push). Sem as chaves VAPID configuradas, não faz nada. */
export const pushConfigured = () => !!(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)

let ready = false
function setup() {
  if (ready || !pushConfigured()) return pushConfigured()
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:suporte@evofit.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  ready = true
  return true
}

export async function savePushSubscription(userId: string, sub: unknown, db: Db = getDb()) {
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  if (typeof s?.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") return false
  await db.tx((q) =>
    q.query(
      `insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)
       on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
      [s.endpoint, userId, s.keys!.p256dh, s.keys!.auth],
    ),
  )
  return true
}

export async function removePushSubscription(userId: string, endpoint: unknown, db: Db = getDb()) {
  if (typeof endpoint !== "string") return
  await db.tx((q) => q.query("delete from push_subscriptions where endpoint = $1 and user_id = $2", [endpoint, userId]))
}

/** Envia para todos os aparelhos das contas; inscrições expiradas são apagadas. */
export async function pushTo(userIds: string[], payload: { title: string; body: string; url: string; tag?: string }, db: Db = getDb()) {
  if (!userIds.length || !setup()) return 0
  const subs = (await db.tx((q) => q.query<{ endpoint: string; p256dh: string; auth: string }>("select endpoint, p256dh, auth from push_subscriptions where user_id = any($1::uuid[])", [userIds]))).rows
  let sent = 0
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 12 })
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await db.tx((q) => q.query("delete from push_subscriptions where endpoint = $1", [s.endpoint])).catch(() => {})
      }
    }),
  )
  return sent
}
