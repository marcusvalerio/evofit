// Gera os arquivos usados pelo app a partir de data/exercises.pt-BR.json:
//   lib/exercise-index.json        → índice leve (nome, músculos, equipamento…), importado no bundle
//   public/exercises/data/<id>.json → passo a passo de cada exercício, carregado sob demanda
// Uso: node scripts/build-exercises.mjs
import fs from "node:fs"
import path from "node:path"

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const source = JSON.parse(fs.readFileSync(path.join(root, "data/exercises.pt-BR.json"), "utf8"))

const MUSCLE = {
  abdominals: "Abdômen",
  abductors: "Abdutores",
  adductors: "Adutores",
  biceps: "Bíceps",
  calves: "Panturrilha",
  chest: "Peito",
  forearms: "Antebraço",
  glutes: "Glúteos",
  hamstrings: "Posteriores",
  lats: "Costas",
  "lower back": "Lombar",
  "middle back": "Costas",
  neck: "Pescoço",
  quadriceps: "Quadríceps",
  shoulders: "Ombros",
  traps: "Trapézio",
  triceps: "Tríceps",
}
const EQUIPMENT = {
  barbell: "Barra",
  dumbbell: "Halteres",
  other: "Outros",
  "body only": "Peso corporal",
  cable: "Cabo / polia",
  machine: "Máquina",
  kettlebells: "Kettlebell",
  bands: "Elástico",
  "medicine ball": "Medicine ball",
  "exercise ball": "Bola suíça",
  "foam roll": "Rolo de espuma",
  "e-z curl bar": "Barra W",
}
const LEVEL = { beginner: "iniciante", intermediate: "intermediario", expert: "avancado" }
const CATEGORY = {
  strength: "Força",
  stretching: "Alongamento",
  plyometrics: "Pliometria",
  powerlifting: "Powerlifting",
  "olympic weightlifting": "Levantamento olímpico",
  strongman: "Strongman",
  cardio: "Cardio",
}

const uniq = (a) => [...new Set(a)]
const index = []
const outDir = path.join(root, "public/exercises/data")
fs.mkdirSync(outDir, { recursive: true })

for (const x of source) {
  const primary = uniq(x.primaryMuscles.map((m) => MUSCLE[m]).filter(Boolean))
  const secondary = uniq(x.secondaryMuscles.map((m) => MUSCLE[m]).filter(Boolean)).filter((m) => !primary.includes(m))
  index.push({
    id: x.id,
    n: x.name,
    en: x.nameEn,
    g: primary[0] ?? "Corpo inteiro",
    pm: primary,
    sm: secondary,
    eq: x.equipment ? EQUIPMENT[x.equipment] ?? "Outros" : "Nenhum",
    lv: LEVEL[x.level],
    c: CATEGORY[x.category],
    img: x.images,
  })
  fs.writeFileSync(path.join(outDir, `${x.id}.json`), JSON.stringify({ id: x.id, steps: x.steps, mechanic: x.mechanic, force: x.force }))
}

index.sort((a, b) => a.n.localeCompare(b.n, "pt-BR"))
fs.writeFileSync(path.join(root, "lib/exercise-index.json"), JSON.stringify(index))
console.log(`${index.length} exercícios → lib/exercise-index.json + public/exercises/data/`)
