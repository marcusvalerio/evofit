import type { Metadata } from "next"
import { StudentShell } from "@/components/student-shell"

export const metadata: Metadata = { title: { default: "App do aluno", template: "%s · EVOFIT Aluno" } }

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>
}
