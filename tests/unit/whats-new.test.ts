import { describe, expect, it } from "vitest"
import { WHATS_NEW, WHATS_NEW_PUSH, WHATS_NEW_VERSION, pushTextFor, whatsNewDecision } from "@/lib/whats-new"

describe("Novidades: uma vez por versão", () => {
  it("mostra quando nunca viu e não sabemos quando a conta foi criada", () => {
    expect(whatsNewDecision(null)).toBe("show")
    expect(whatsNewDecision(null, undefined)).toBe("show")
  })
  it("não mostra de novo a mesma versão", () => {
    expect(whatsNewDecision(WHATS_NEW_VERSION)).toBe("skip")
    expect(whatsNewDecision(WHATS_NEW_VERSION, "2027-01-01T00:00:00Z")).toBe("skip")
  })
  it("mostra a versão nova para quem viu uma anterior", () => {
    expect(whatsNewDecision("2026-01")).toBe("show")
    expect(whatsNewDecision("2026-01", "2027-01-01T00:00:00Z")).toBe("show")
  })
  it("conta antiga vê; conta nova (criada depois do lançamento) só grava", () => {
    expect(whatsNewDecision(null, "2026-03-10T12:00:00Z")).toBe("show")
    expect(whatsNewDecision(null, "2026-11-24T15:00:00Z")).toBe("show")
    expect(whatsNewDecision(null, "2026-11-26T10:00:00Z")).toBe("mark")
  })
  it("data inválida conta como desconhecida", () => {
    expect(whatsNewDecision(null, "ontem")).toBe("show")
  })
})

describe("Novidades: texto do push por papel", () => {
  it("aluno recebe o texto do aluno e abre /aluno", () => {
    const p = pushTextFor("student")
    expect(p.title).toBe("Agora dá pra falar com seu personal")
    expect(p.body).toBe("Chat no app, medalhas no Perfil e cartão para os stories. Abra e veja o que mudou.")
    expect(p.url).toBe("/aluno")
  })
  it("personal recebe o texto do personal e abre /studio", () => {
    const p = pushTextFor("trainer")
    expect(p.title).toBe("Novidades para você e seus alunos")
    expect(p.body).toBe("Mensagens com horário de atendimento, Central de Avisos e alunos sem limite na beta.")
    expect(p.url).toBe("/studio")
    expect(p.tag).toBe(`novidades-${WHATS_NEW_VERSION}`)
  })
  it("textos cabem na notificação", () => {
    for (const p of Object.values(WHATS_NEW_PUSH)) {
      expect(p.title.length).toBeLessThanOrEqual(40)
      expect(p.body.length).toBeLessThanOrEqual(110)
    }
  })
  it("último botão: aluno fecha, personal vai aos alunos", () => {
    expect(WHATS_NEW.aluno.end).toBe("Bora treinar")
    expect(WHATS_NEW.aluno.href).toBeUndefined()
    expect(WHATS_NEW.personal.end).toBe("Ver meus alunos")
    expect(WHATS_NEW.personal.href).toBe("/studio/alunos")
  })
})
