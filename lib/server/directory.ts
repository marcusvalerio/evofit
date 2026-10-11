import { randomUUID } from "node:crypto"
import type { TrainerProfile } from "../types"
import { validateContact } from "../actions"
import { withTenant, type Db } from "./db"
import { HttpError } from "./workspace"

type Row = Record<string, unknown>
const toProfile = (t: Row): TrainerProfile => ({
  slug: String(t.slug),
  name: String(t.name),
  headline: String(t.headline),
  bio: String(t.bio),
  city: String(t.city),
  state: String(t.state),
  region: String(t.region),
  modality: t.modality as TrainerProfile["modality"],
  specialties: (t.specialties as string[]) ?? [],
  registry: String(t.registry),
  accent: t.accent as TrainerProfile["accent"],
  directoryVisible: true,
})

/** Perfis com opt-in no diretório (a política de RLS só devolve esses ao papel público). */
export async function publicProfiles(db?: Db) {
  const r = await withTenant(
    { role: "public", trainerId: null },
    (q) => q.query<Row>("select slug, name, headline, bio, city, state, region, modality, specialties, registry, accent from trainers where directory_visible order by name limit 500"),
    db,
  )
  return r.rows.map(toProfile)
}

export async function sendContact(input: Record<string, unknown>, db?: Db) {
  const slug = typeof input.slug === "string" ? input.slug : ""
  const c = { name: String(input.name ?? "").trim(), contact: String(input.contact ?? "").trim(), message: String(input.message ?? "").trim() }
  if (input.consent !== true) throw new HttpError(400, "Confirme a autorização para continuar.")
  if (Object.keys(validateContact(c)).length || c.name.length > 80 || c.contact.length > 120) throw new HttpError(400, "Verifique os campos.")
  const t = await withTenant({ role: "public", trainerId: null }, (q) => q.query<{ id: string }>("select id from trainers where slug = $1 and directory_visible", [slug]), db)
  const trainerId = t.rows[0]?.id
  if (!trainerId) throw new HttpError(404, "Profissional não encontrado no diretório.")
  await withTenant(
    { role: "public", trainerId },
    (q) => q.query("insert into contact_requests (trainer_id, id, name, contact, message) values ($1, $2, $3, $4, $5)", [trainerId, `ct-${randomUUID().slice(0, 8)}`, c.name, c.contact, c.message]),
    db,
  )
}
