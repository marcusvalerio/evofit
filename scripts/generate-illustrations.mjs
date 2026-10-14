import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(process.cwd(), "lib/exercise-index.json");
const outDir = path.join(process.cwd(), "public/illustrations/catalog");
const exercises = JSON.parse(fs.readFileSync(indexPath, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

function assetKey(id) {
  let hash = 2166136261;
  for (const char of id) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  const slug = id.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "exercise";
  return slug + "-" + (hash >>> 0).toString(36);
}
function family(ex) {
  const n = (ex.n + " " + ex.en + " " + ex.eq + " " + ex.g).toLowerCase();
  if (/bike|bicycle|cycling|elliptical|treadmill|run|running|jump rope|burpee|mountain climber|cardio|rowing machine/.test(n)) return "cardio";
  if (/plank|crunch|sit.?up|leg raise|dead bug|hollow|russian twist|woodchop|abdominal|oblique/.test(n)) return "core";
  if (/squat|agachamento|leg press|hack squat/.test(n)) return "squat";
  if (/lunge|passada|step.?up|split squat|afundo/.test(n)) return "lunge";
  if (/deadlift|dead lift|good morning|hip hinge|romanian|stiff|levantamento terra|hip thrust|glute bridge/.test(n)) return "hinge";
  if (/row|remada|pulldown|pull.?up|chin.?up|lat pul|barra fixa/.test(n)) return "pull";
  if (/curl|rosca|biceps|bíceps/.test(n)) return "curl";
  if (/triceps|tríceps|pushdown|skull crusher|kickback/.test(n)) return "triceps";
  if (/shoulder|overhead|military press|lateral raise|front raise|deltoid|ombro|desenvolvimento/.test(n)) return "shoulder";
  if (/press|bench|supino|push.?up|flexão|chest fly|pec deck|flye/.test(n)) return "push";
  if (/calf|panturrilha|heel raise/.test(n)) return "calf";
  if (/leg extension|leg curl|hamstring|quadriceps|quad|adductor|abductor|glute|coxa|extensora|flexora/.test(n)) return "legs";
  return "standing";
}
const poses = {
  squat: [[91,113,110,141],[91,113,121,149]],
  lunge: [[90,113,108,141],[90,113,126,143]],
  hinge: [[90,113,116,128],[90,113,126,132]],
  pull: [[90,113,105,133],[90,113,119,124]],
  curl: [[90,113,95,137],[90,113,104,126]],
  triceps: [[90,113,100,133],[90,113,116,130]],
  shoulder: [[90,113,90,139],[90,113,90,120]],
  push: [[90,113,91,141],[90,113,91,125]],
  core: [[90,113,119,130],[90,113,111,137]],
  calf: [[90,113,91,139],[90,113,91,134]],
  legs: [[90,113,104,141],[90,113,114,139]],
  cardio: [[90,113,106,134],[90,113,113,129]],
  standing: [[90,113,94,138],[90,113,106,132]]
};
function figure(x, y, bend, accent, phase, fam) {
  const lean = fam === "hinge" ? 18 : fam === "core" ? 12 : 0;
  const armY = fam === "shoulder" ? -23 + phase * 7 : fam === "push" ? 7 : fam === "pull" ? -5 + phase * 8 : fam === "curl" ? -4 - phase * 5 : 2;
  const leg = fam === "lunge" ? 12 + phase * 8 : fam === "squat" ? 8 + phase * 6 : fam === "cardio" ? 10 - phase * 14 : 0;
  return '<g transform="translate(' + x + ' ' + y + ')">' +
    '<ellipse cx="0" cy="50" rx="27" ry="5" fill="#1F282E" opacity=".09"/>' +
    '<circle cx="' + (lean * .35) + '" cy="-34" r="10" fill="#D9A17F"/>' +
    '<path d="M ' + (-9 + lean * .3) + ' -25 Q ' + (lean + 8) + ' -29 ' + (10 + lean * .3) + ' -23 L ' + (13 + lean) + ' 4 Q ' + (lean + 4) + ' 13 ' + (-8 + lean) + ' 12 Z" fill="#414E58"/>' +
    '<path d="M ' + (-7 + lean) + ' 9 L ' + (-16 - leg * .3) + ' ' + (31 + leg * .3) + ' L ' + (-20 - leg * .3) + ' 45 L ' + (-8 - leg * .3) + ' 45 L ' + (2 + lean * .3) + ' 15 Z" fill="#DAD8CF" stroke="#414E58" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M ' + (4 + lean) + ' 9 L ' + (13 + leg * .3) + ' ' + (28 - leg * .3) + ' L ' + (20 + leg * .3) + ' 44 L ' + (31 + leg * .3) + ' 44 L ' + (26 + lean * .3) + ' 9 Z" fill="#E4E3DC" stroke="#414E58" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M ' + (-7 + lean * .3) + ' -20 L ' + (-17 + bend * .25) + ' ' + armY + ' L ' + (-24 + bend * .25) + ' ' + (armY + 8) + ' M ' + (7 + lean * .3) + ' -20 L ' + (17 + bend * .25) + ' ' + armY + ' L ' + (24 + bend * .25) + ' ' + (armY + 8) + '" fill="none" stroke="#D9A17F" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
    (fam === "push" || fam === "squat" || fam === "pull" || fam === "hinge" ? '<path d="M -30 ' + (armY + 7) + ' H 30" stroke="' + accent + '" stroke-width="4" stroke-linecap="round"/><path d="M -30 ' + (armY + 1) + ' v 12 M 30 ' + (armY + 1) + ' v 12" stroke="#414E58" stroke-width="2"/>' : '') +
    '<path d="M -18 46 h 12 M 20 45 h 12" stroke="#414E58" stroke-width="4" stroke-linecap="round"/>' +
    '</g>';
}
function svg(ex) {
  const fam = family(ex), accent = "#FF4E20", label = String(ex.n || ex.en).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const p = poses[fam] || poses.standing;
  const primary = (ex.pm || []).slice(0, 2).join(" · ") || ex.g || "Corpo inteiro";
  const escPrimary = String(primary).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img" aria-labelledby="title desc"><title id="title">' + label + '</title><desc id="desc">Ilustração vetorial EVOFIT em duas fases do movimento. Grupos musculares principais: ' + escPrimary + '.</desc>' +
    '<rect width="480" height="320" rx="24" fill="#E4E3DC"/><rect x="12" y="12" width="456" height="296" rx="18" fill="#DAD8CF"/>' +
    '<g opacity=".4" stroke="#414E58" stroke-width="1"><path d="M30 240 H450 M30 260 H450 M30 280 H450"/></g>' +
    '<rect x="28" y="28" width="194" height="230" rx="16" fill="#E4E3DC"/><rect x="258" y="28" width="194" height="230" rx="16" fill="#E4E3DC"/>' +
    '<text x="44" y="50" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.5" fill="#414E58">01 / INÍCIO</text><text x="274" y="50" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.5" fill="#414E58">02 / MOVIMENTO</text>' +
    '<g transform="translate(28 55)">' + figure(97, 132, p[0][2], accent, 0, fam) + '</g><g transform="translate(258 55)">' + figure(97, 132, p[1][2], accent, 1, fam) + '</g>' +
    '<path d="M229 143 h20 m-7 -7 7 7 -7 7" fill="none" stroke="' + accent + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="28" y="270" width="424" height="28" rx="8" fill="#1F282E"/><text x="42" y="288" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#E4E3DC">' + escPrimary.slice(0, 46) + '</text><circle cx="432" cy="284" r="5" fill="' + accent + '"/></svg>';
}
for (const ex of exercises) fs.writeFileSync(path.join(outDir, assetKey(ex.id) + ".svg"), svg(ex));
console.log("Generated " + exercises.length + " EVOFIT exercise illustrations.");
