/**
 * Modo demonstração (dados fictícios no navegador). Só existe quando o app roda sem banco
 * (desenvolvimento) ou com DEMO_MODE=on (testes). Com contas reais, quem não entrou vê só as
 * páginas públicas e é levado ao login ao abrir o Studio ou o app do aluno.
 */
export function demoEnabled(env: Record<string, string | undefined> = process.env) {
  return !env.DATABASE_URL || env.DEMO_MODE === "on"
}
