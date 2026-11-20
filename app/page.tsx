import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import source from "@/lib/landing/aluno"

export const metadata: Metadata = {
  title: { absolute: "EVOFIT — A gente te ajuda a se cuidar" },
  description: "Seu treino, no seu ritmo, no seu bolso. Sozinho ou com um personal do seu lado.",
}

export default function Home() {
  return <LandingPage source={source} />
}
