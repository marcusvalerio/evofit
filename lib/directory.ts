import type { TrainerProfile } from "./types"

export interface DirectoryProfile extends TrainerProfile {
  /** true = perfil fictício criado apenas para a demonstração. */
  fictional: boolean
}

const p = (x: Omit<DirectoryProfile, "fictional" | "registry" | "directoryVisible">): DirectoryProfile => ({
  ...x,
  registry: "",
  directoryVisible: true,
  fictional: true,
})

/**
 * Perfis fictícios para demonstrar a busca do diretório.
 * Não representam pessoas reais: sem avaliações, certificações ou contatos.
 */
export const DIRECTORY_PROFILES: DirectoryProfile[] = [
  p({ slug: "lucas-andrade-demo", name: "Lucas Andrade", headline: "Força e performance para quem já treina", bio: "Perfil fictício de demonstração. Programas periodizados de força com foco nos levantamentos básicos.", city: "São Paulo", state: "SP", region: "Zona Sul", modality: "presencial", specialties: ["Força", "Hipertrofia"], accent: "cobblestone" }),
  p({ slug: "marina-costa-demo", name: "Marina Costa", headline: "Treino online para rotinas corridas", bio: "Perfil fictício de demonstração. Treinos curtos e adaptáveis para casa ou academia.", city: "Rio de Janeiro", state: "RJ", region: "Online", modality: "online", specialties: ["Emagrecimento", "Funcional", "Condicionamento"], accent: "otan" }),
  p({ slug: "renato-sousa-demo", name: "Renato Sousa", headline: "Treinamento para longevidade", bio: "Perfil fictício de demonstração. Força, equilíbrio e autonomia para pessoas acima de 60 anos.", city: "Belo Horizonte", state: "MG", region: "Centro-Sul", modality: "presencial", specialties: ["Idosos", "Mobilidade", "Reabilitação"], accent: "smoke" }),
  p({ slug: "julia-martins-demo", name: "Júlia Martins", headline: "Acompanhamento na gestação e no pós-parto", bio: "Perfil fictício de demonstração. Treinos adaptados a cada fase, em parceria com a equipe de saúde.", city: "Curitiba", state: "PR", region: "Batel", modality: "hibrido", specialties: ["Gestantes", "Mobilidade"], accent: "gravy" }),
  p({ slug: "pedro-almeida-demo", name: "Pedro Almeida", headline: "Corrida de rua do primeiro 5 km à maratona", bio: "Perfil fictício de demonstração. Planilhas de corrida combinadas com fortalecimento.", city: "Porto Alegre", state: "RS", region: "Moinhos de Vento", modality: "hibrido", specialties: ["Corrida", "Condicionamento"], accent: "otan" }),
  p({ slug: "tais-oliveira-demo", name: "Taís Oliveira", headline: "Hipertrofia feminina com técnica", bio: "Perfil fictício de demonstração. Ênfase em membros inferiores e progressão de carga.", city: "Recife", state: "PE", region: "Boa Viagem", modality: "presencial", specialties: ["Hipertrofia", "Emagrecimento"], accent: "gravy" }),
  p({ slug: "andre-lima-demo", name: "André Lima", headline: "Funcional e condicionamento em grupo reduzido", bio: "Perfil fictício de demonstração. Circuitos ao ar livre e treinos online complementares.", city: "São Paulo", state: "SP", region: "Zona Oeste", modality: "hibrido", specialties: ["Funcional", "Condicionamento", "Emagrecimento"], accent: "smoke" }),
  p({ slug: "beatriz-nunes-demo", name: "Beatriz Nunes", headline: "Retorno ao treino após lesão", bio: "Perfil fictício de demonstração. Progressões graduais em conjunto com fisioterapia.", city: "Florianópolis", state: "SC", region: "Online", modality: "online", specialties: ["Reabilitação", "Mobilidade", "Força"], accent: "cobblestone" }),
]

export interface DirectoryFilters {
  q: string
  state: string
  modality: string
  specialty: string
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function filterProfiles(list: DirectoryProfile[], f: DirectoryFilters) {
  const q = norm(f.q.trim())
  return list.filter((p) => {
    if (!p.directoryVisible) return false
    if (f.state && p.state !== f.state) return false
    // Profissionais híbridos atendem tanto presencial quanto online.
    if (f.modality && p.modality !== f.modality && !(p.modality === "hibrido" && f.modality !== "hibrido")) return false
    if (f.specialty && !p.specialties.includes(f.specialty)) return false
    if (q) {
      const hay = norm([p.name, p.city, p.state, p.region, p.headline, ...p.specialties].join(" "))
      if (!q.split(/\s+/).every((t) => hay.includes(t))) return false
    }
    return true
  })
}

/**
 * Junta os perfis reais (do banco, com opt-in), o perfil da demonstração (somente com opt-in, no modo
 * demonstração) e os perfis fictícios.
 */
export function directoryList(own: TrainerProfile | null, real: TrainerProfile[] = []): DirectoryProfile[] {
  const list: DirectoryProfile[] = real.map((p) => ({ ...p, fictional: false }))
  if (own && own.directoryVisible) list.push({ ...own, fictional: true })
  const taken = new Set(list.map((p) => p.slug))
  return [...list, ...DIRECTORY_PROFILES.filter((p) => !taken.has(p.slug))]
}
