/** Caixa de Novidades: conteúdo, textos do push e a regra "mostra uma vez por versão". */

export const WHATS_NEW_VERSION = "2026-11"
/** Contas criadas depois desta data já nascem com as novidades: não precisam do tour. */
export const WHATS_NEW_SINCE = "2026-11-24T23:59:59-03:00"
export const WHATS_NEW_KEY = "evofit:novidades"

export type WhatsNewWho = "aluno" | "personal"
export type WhatsNewScene = "chat" | "avisos" | "medalhas" | "stories" | "visual" | "horario" | "central" | "biblio" | "alunos"
export interface WhatsNewSlide {
  scene: WhatsNewScene
  tag: string
  title: string
  text: string
}

export const WHATS_NEW: Record<WhatsNewWho, { end: string; href?: string; slides: WhatsNewSlide[] }> = {
  aluno: {
    end: "Bora treinar",
    slides: [
      { scene: "chat", tag: "Chat", title: "Fale com seu personal", text: "Conversa 1 a 1. Comente uma série direto do treino e veja quando ele leu: Enviada, Vista." },
      { scene: "avisos", tag: "Avisos", title: "Saiba na hora que ele responder", text: "Ligue os avisos no chat e receba no celular quando chegar mensagem." },
      { scene: "medalhas", tag: "Medalhas", title: "Suas medalhas no Perfil", text: "Bronze com 10 treinos. Prata com 4 semanas seguidas. Ouro no recorde pessoal. Absoluto com 100 treinos." },
      { scene: "stories", tag: "Stories", title: "Seu treino nos stories", text: "No fim do treino, compartilhe o cartão do treino ou do recorde." },
      { scene: "visual", tag: "Visual", title: "Um visual novo", text: "Barra de vidro embaixo e telas redesenhadas. O treino continua o mesmo." },
    ],
  },
  personal: {
    end: "Ver meus alunos",
    href: "/studio/alunos",
    slides: [
      { scene: "horario", tag: "Mensagens", title: "Mensagens no seu horário", text: "Defina quando você atende. Por padrão, fica livre 24h." },
      { scene: "central", tag: "Avisos", title: "Central de Avisos", text: "Dor forte, aluno sumindo e recordes num só lugar." },
      { scene: "biblio", tag: "Computador", title: "Biblioteca ao lado da ficha", text: "No computador, a biblioteca fica aberta do lado da ficha enquanto você monta." },
      { scene: "alunos", tag: "Beta", title: "Alunos sem limite", text: "Durante a beta, você pode ter quantos alunos quiser." },
    ],
  },
}

export const WHATS_NEW_PUSH: Record<WhatsNewWho, { title: string; body: string; url: string }> = {
  aluno: { title: "Agora dá pra falar com seu personal", body: "Chat no app, medalhas no Perfil e cartão para os stories. Abra e veja o que mudou.", url: "/aluno" },
  personal: { title: "Novidades para você e seus alunos", body: "Mensagens com horário de atendimento, Central de Avisos e alunos sem limite na beta.", url: "/studio" },
}

/** Texto do push conforme o papel do dono da inscrição (users.role). */
export function pushTextFor(role: string) {
  return { ...WHATS_NEW_PUSH[role === "student" ? "aluno" : "personal"], tag: `novidades-${WHATS_NEW_VERSION}` }
}

/**
 * "show": abre a caixa. "mark": conta nova (nunca viu nada e foi criada depois do lançamento):
 * só grava a versão. "skip": já viu esta versão. Sem data de criação, mostra normalmente.
 */
export function whatsNewDecision(seen: string | null, createdAt?: string | null, version = WHATS_NEW_VERSION, since = WHATS_NEW_SINCE): "show" | "mark" | "skip" {
  if (seen === version) return "skip"
  if (!seen && createdAt) {
    const c = Date.parse(createdAt)
    if (Number.isFinite(c) && c > Date.parse(since)) return "mark"
  }
  return "show"
}
