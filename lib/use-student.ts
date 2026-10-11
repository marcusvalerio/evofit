"use client"
import { useData } from "./store"

/** Aluno atualmente selecionado na experiência do aluno (sem login na demonstração). */
export function useActiveStudent() {
  const d = useData()
  const student = d.students.find((s) => s.id === d.activeStudentId && s.status === "ativo") ?? null
  return { d, student }
}
