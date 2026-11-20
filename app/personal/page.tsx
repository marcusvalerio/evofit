import type { Metadata } from "next"
import { LandingPage } from "@/components/landing/landing-page"
import source from "@/lib/landing/personal"

export const metadata: Metadata = {
  title: "Para personal trainers",
  description: "Acompanhe cada série dos seus alunos e saiba quem precisa de você antes que ele desista.",
}

export default function PersonalLanding() {
  return <LandingPage source={source} />
}
