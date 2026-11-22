/**
 * Dados do responsável pelo EVOFIT usados nos Termos e na Política de Privacidade.
 * Preencha pelas variáveis de ambiente (NEXT_PUBLIC_...) antes de vender.
 */
export const LEGAL = {
  /** Versão vigente dos documentos (gravada no aceite de cada conta). */
  version: "2026-11-22",
  updated: "22 de novembro de 2026",
  owner: process.env.NEXT_PUBLIC_LEGAL_NAME || "[NOME OU RAZÃO SOCIAL DO RESPONSÁVEL]",
  document: process.env.NEXT_PUBLIC_LEGAL_DOC || "[CPF OU CNPJ]",
  city: process.env.NEXT_PUBLIC_LEGAL_CITY || "Rio de Janeiro/RJ",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "[E-MAIL DE CONTATO]",
}
