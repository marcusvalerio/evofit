import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createSeed } from "@/lib/seed"
import { WORKOUT_CSV_TEMPLATE, applyImport, matchExercise, parseWorkoutCsv, planImport } from "@/lib/import"

const NOW = new Date("2026-11-22T12:00:00")

describe("importação de fichas por planilha", () => {
  it("lê CSV com ; , aspas, vírgula decimal e cabeçalho com acentos", () => {
    const { rows, errors } = parseWorkoutCsv('﻿Treino;Exercício;Séries;Repetições;Carga;Descanso;Observação\nA;"Supino; reto";4;10;32,5;90;ok\n')
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ workout: "A", exercise: "Supino; reto", sets: 4, reps: "10", load: 32.5, restSec: 90, notes: "ok" })
    const comma = parseWorkoutCsv("exercicio,series\nPrancha,3\n")
    expect(comma.rows[0]).toMatchObject({ exercise: "Prancha", sets: 3, workout: "Treino importado", load: null })
  })

  it("aponta linhas inválidas e cabeçalho sem exercício", () => {
    expect(parseWorkoutCsv("treino;exercicio;series\nA;Prancha;40\n").errors[0]).toMatch(/Linha 2/)
    expect(parseWorkoutCsv("a;b\n1;2").errors[0]).toMatch(/exercicio/)
    expect(parseWorkoutCsv("").errors.length).toBe(1)
  })

  it("acha exercícios do catálogo pelo nome em português ou inglês", () => {
    const d = createSeed(NOW)
    expect(matchExercise(d, "agachamento com barra")?.id).toBe("Barbell_Squat")
    expect(matchExercise(d, "Leg press 45")?.id).toBe("Leg_Press")
    expect(matchExercise(d, "Barbell Curl")?.id).toBe("Barbell_Curl")
    expect(matchExercise(d, "Exercício inventado xyz")).toBeNull()
  })

  it("cria fichas, exercícios próprios e atribui ao aluno", () => {
    const d = createSeed(NOW)
    const plan = planImport(d, "treino;exercicio;series;repeticoes;carga\nA;Agachamento com barra;4;10;40\nA;Meu exercício;3;12;\nB;Prancha;3;40 s;\n")
    expect(plan.workouts.map((w) => w.name)).toEqual(["A", "B"])
    expect(plan.newExercises).toEqual(["Meu exercício"])
    const student = d.students[0].id
    const { data, workoutIds } = applyImport(d, plan, student)
    expect(data.workouts.length).toBe(d.workouts.length + 2)
    const a = data.workouts.find((w) => w.id === workoutIds[0])!
    expect(a.studentIds).toEqual([student])
    expect(a.items[0]).toMatchObject({ exerciseId: "Barbell_Squat", sets: 4, reps: "10", load: 40 })
    expect(data.exercises.find((e) => e.id === a.items[1].exerciseId)?.name).toBe("Meu exercício")
  })

  it("a planilha modelo e a ficha ABCD batem 100% com o catálogo", () => {
    const d = createSeed(NOW)
    for (const csv of [WORKOUT_CSV_TEMPLATE, fs.readFileSync(path.join(process.cwd(), "public/modelos/evofit-treino-abcd.csv"), "utf8")]) {
      const plan = planImport(d, csv)
      expect(plan.errors).toEqual([])
      expect(plan.newExercises).toEqual([])
    }
    expect(planImport(d, fs.readFileSync(path.join(process.cwd(), "public/modelos/evofit-treino-abcd.csv"), "utf8")).workouts.length).toBe(4)
  })
})
