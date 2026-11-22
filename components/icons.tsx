/**
 * Ícones EVO: família "gordinha" (formas cheias, curvas gordas, sem quinas).
 * Cada ícone é desenhado numa grade de 24 como máscara: o que é branco aparece, o que é preto vira recorte.
 * Mantém os mesmos nomes e props usados antes (size, className, color, aria-*), então substitui o lucide-react
 * sem mudar as telas. strokeWidth e fill são aceitos e ignorados.
 */
import { forwardRef, useId, type CSSProperties, type SVGProps } from "react"

type Props = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  color?: string
}
export type EvoIcon = ReturnType<typeof make>
export type LucideIcon = EvoIcon

// ---------- primitivas (strings SVG dentro da máscara) ----------
const S = (d: string, w = 3.4) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
const C = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`
const R = (x: number, y: number, w: number, h: number, r: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fff"/>`
const P = (d: string) => `<path d="${d}" fill="#fff"/>`
const HS = (d: string, w = 2.4) => `<path d="${d}" fill="none" stroke="#000" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
const HC = (x: number, y: number, r: number) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#000"/>`
const HP = (d: string) => `<path d="${d}" fill="#000"/>`
const HR = (x: number, y: number, w: number, h: number, r: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#000"/>`
/** Linha "solta" (setas, x, +): traço grosso de ponta redonda, sem forma de fundo. */
const L = (d: string, w = 3) => S(d, w)

// ---------- desenhos ----------
const play = P("M8.6 5.5v13c0 1.1 1.2 1.8 2.2 1.2l10-6.5c.9-.6.9-1.8 0-2.4l-10-6.5c-1-.6-2.2.1-2.2 1.2Z")
const user = C(12, 7.6, 5) + P("M12 13.5c5.2 0 8.8 2.8 8.8 6.2 0 1.3-1 2.3-2.3 2.3H5.5c-1.3 0-2.3-1-2.3-2.3 0-3.4 3.6-6.2 8.8-6.2Z")
const userSmall = C(9.5, 7.6, 4.6) + P("M9.5 13.4c4.6 0 7.8 2.6 7.8 5.8 0 1.4-1 2.3-2.3 2.3H4c-1.3 0-2.3-.9-2.3-2.3 0-3.2 3.2-5.8 7.8-5.8Z")
const plusBadge = C(18.5, 16, 4.6)
const plusBadgeHole = HS("M18.5 13.6v4.8M16.1 16h4.8", 2)
const warn = P("M10.3 3.2c.8-1.3 2.6-1.3 3.4 0l8.1 14c.8 1.3-.2 3-1.7 3H3.9c-1.5 0-2.5-1.7-1.7-3Z")
const warnHole = HS("M12 9v4", 2.8) + HC(12, 16.6, 1.6)
const shield = P("M12 2.2c.3 0 .6.1.9.2l6.7 2.6c.8.3 1.4 1.1 1.4 2v4.6c0 5.2-3.8 9.2-8.4 10.7-.4.1-.8.1-1.2 0C6.8 20.8 3 16.8 3 11.6V7c0-.9.6-1.7 1.4-2l6.7-2.6c.3-.1.6-.2.9-.2Z")
const circle = C(12, 12, 10)
const box = R(2.5, 2.5, 19, 19, 6.5)
const msg = P("M7 3h10a5 5 0 0 1 5 5v5a5 5 0 0 1-5 5h-4.6l-4.6 3.3c-.7.5-1.6 0-1.6-.8V18A5 5 0 0 1 2 13V8a5 5 0 0 1 5-5Z")
const calendar = R(2.8, 4.4, 18.4, 17.6, 5.5) + S("M8 2.5v4M16 2.5v4", 3.2)
const clipboard = R(3.5, 3.5, 17, 18.5, 5) + R(8, 1.6, 8, 4.4, 2.2)
const archive = R(2, 3, 20, 6.4, 3) + R(3.5, 8.4, 17, 13, 4.5)
const phone = R(5, 1.8, 14, 20.4, 5)

const D: Record<string, [string, string?]> = {
  // navegação e setas (traços)
  ArrowLeft: [L("M19 12H5.5M11 5.5 4.5 12l6.5 6.5")],
  ArrowRight: [L("M5 12h13.5M13 5.5l6.5 6.5-6.5 6.5")],
  ArrowUp: [L("M12 19V5.5M5.5 11 12 4.5l6.5 6.5")],
  ArrowDown: [L("M12 5v13.5M5.5 13l6.5 6.5 6.5-6.5")],
  ChevronLeft: [L("M15 5.5 8.5 12l6.5 6.5", 3.4)],
  ChevronRight: [L("M9 5.5l6.5 6.5L9 18.5", 3.4)],
  ChevronDown: [L("M5.5 9l6.5 6.5L18.5 9", 3.4)],
  X: [L("M6 6l12 12M18 6 6 18", 3.2)],
  Plus: [L("M12 4.5v15M4.5 12h15", 3.2)],
  Check: [L("m4.5 12.5 4.8 4.8L19.5 7", 3.4)],
  MoreHorizontal: [C(5, 12, 2.4) + C(12, 12, 2.4) + C(19, 12, 2.4)],
  Undo2: [L("M9 4.5 4.5 9 9 13.5M4.5 9h10a5 5 0 0 1 0 10H11")],
  RotateCcw: [L("M4.5 4.5v5h5M5.2 9.5A8 8 0 1 1 4 13")],
  RefreshCw: [L("M19.5 4.5v5h-5M4.5 19.5v-5h5M18.8 9.5A7.5 7.5 0 0 0 5.6 8M5.2 14.5A7.5 7.5 0 0 0 18.4 16")],
  History: [circle, HS("M12 7.2V12l3.2 2", 2.6)],
  ExternalLink: [box, HS("M10 14l6-6M11.5 8H16v4.5", 2.4)],
  Link2: [L("M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8.5 12h7")],
  Unlink: [L("M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M12 4v2.5M12 17.5V20")],
  LogIn: [R(13, 2.5, 8.5, 19, 4.5) + L("M3 12h9M8.5 7.5 13 12l-4.5 4.5")],
  LogOut: [R(2.5, 2.5, 8.5, 19, 4.5) + L("M11 12h10M16.5 7.5 21 12l-4.5 4.5")],
  Download: [L("M12 3.5v11M7 10l5 5 5-5") + R(3, 18, 18, 3.6, 1.8)],
  Share2: [C(18, 5.5, 3.6) + C(6, 12, 3.6) + C(18, 18.5, 3.6) + S("M8.6 10.6l6.8-3.6M8.6 13.4l6.8 3.6", 2.6)],
  Copy: [R(8, 8, 13.5, 13.5, 4.5) + S("M5.5 15.5h-.5a2.5 2.5 0 0 1-2.5-2.5V5A2.5 2.5 0 0 1 5 2.5h8a2.5 2.5 0 0 1 2.5 2.5v.5", 3)],
  // treino
  Dumbbell: [R(1.8, 8, 5.4, 8, 2.7) + R(16.8, 8, 5.4, 8, 2.7) + S("M7 12h10", 3.6)],
  Play: [play],
  PlayCircle: [circle, HP("M9.8 7.9v8.2c0 .9 1 1.4 1.7.9l6-4.1c.6-.4.6-1.4 0-1.8l-6-4.1c-.7-.5-1.7 0-1.7.9Z")],
  Pause: [R(5, 3.5, 5, 17, 2.5) + R(14, 3.5, 5, 17, 2.5)],
  Timer: [C(12, 13.3, 8.8) + R(9, 1.4, 6, 3, 1.5), HS("M12 9.2v4.4l2.6 1.7", 2.6)],
  Clock: [circle, HS("M12 7v5l3 2", 2.6)],
  Activity: [L("M2.5 12h4l3-7 5 14 3-7h4", 3.2)],
  Trophy: [P("M6.5 2.5h11a1.5 1.5 0 0 1 1.5 1.5v4a7 7 0 0 1-14 0V4a1.5 1.5 0 0 1 1.5-1.5Z") + S("M5.4 5.5H4a2 2 0 0 0 0 4c.8 0 1.4-.2 1.8-.6M18.6 5.5H20a2 2 0 0 1 0 4c-.8 0-1.4-.2-1.8-.6", 2.6) + S("M12 15v3", 3.6) + R(6.5, 18.4, 11, 3.6, 1.8)],
  Medal: [S("M8 2.5 12 9l4-6.5", 3.6) + C(12, 15, 7.2), HS("M12 11.8v6.2M9.4 14.6 12 11.8", 2.4)],
  BadgeCheck: [P("M12 1.8 14.6 4l3.4-.3.8 3.3 3 1.7-1.4 3.1 1.4 3.1-3 1.7-.8 3.3-3.4-.3L12 22.2 9.4 20l-3.4.3-.8-3.3-3-1.7L3.6 12 2.2 8.9l3-1.7.8-3.3 3.4.3Z"), HS("m8 12.2 2.8 2.8L16 9.6", 2.6)],
  Ruler: [P("M3.4 15.7 15.7 3.4a2 2 0 0 1 2.8 0l2.1 2.1a2 2 0 0 1 0 2.8L8.3 20.6a2 2 0 0 1-2.8 0l-2.1-2.1a2 2 0 0 1 0-2.8Z"), HS("M8.5 11.5l1.6 1.6M11.5 8.5l1.6 1.6M14.5 5.5l1.6 1.6", 1.8)],
  Flag: [S("M5 21.5V3.5", 3.2) + P("M6.5 3h11.6c1 0 1.6 1.1 1 1.9L16.8 8l2.3 3.1c.6.8 0 1.9-1 1.9H6.5Z")],
  // pessoas
  UserRound: [user],
  UserPlus: [userSmall + plusBadge, plusBadgeHole],
  UserRoundPlus: [userSmall + plusBadge, plusBadgeHole],
  Users: [C(8.8, 8, 4.3) + P("M8.8 13.6c4.3 0 7.3 2.4 7.3 5.4 0 1.2-.9 2-2 2H3.5c-1.1 0-2-.8-2-2 0-3 3-5.4 7.3-5.4Z") + C(17.3, 6.6, 3.2) + P("M17.6 11.6c3 0 5 1.7 5 4 0 .9-.6 1.5-1.5 1.5h-3.3c-.2-2.2-1.2-4.1-2.8-5.3.8-.1 1.6-.2 2.6-.2Z")],
  // comunicação
  MessageCircle: [P("M12 2a10 10 0 0 0-8.7 15l-1.2 3.6c-.2.7.4 1.3 1.1 1.1L6.9 20.6A10 10 0 1 0 12 2Z"), HC(7.8, 12, 1.5) + HC(12, 12, 1.5) + HC(16.2, 12, 1.5)],
  MessageSquare: [msg, HC(7.8, 10.5, 1.5) + HC(12, 10.5, 1.5) + HC(16.2, 10.5, 1.5)],
  Inbox: [R(2.5, 3.5, 19, 17, 5.5), HP("M2.5 12.5h5l1.5 2.5h6l1.5-2.5h5v3H2.5Z")],
  Instagram: [R(2.5, 2.5, 19, 19, 6.5), HC(12, 12, 4.4) + HC(17.4, 6.6, 1.4)],
  // conteúdo e ações
  Search: [C(10.5, 10.5, 8) + S("m16.5 16.5 4.5 4.5", 4.2), HC(10.5, 10.5, 4.2)],
  SearchX: [C(10.5, 10.5, 8) + S("m16.5 16.5 4.5 4.5", 4.2), HS("M8 8l5 5M13 8l-5 5", 2.4)],
  Pencil: [P("M15.6 3.4a2.8 2.8 0 0 1 4 0l1 1a2.8 2.8 0 0 1 0 4L9.4 19.6c-.4.4-.8.6-1.3.7l-4.4 1c-.6.1-1.1-.4-1-1l1-4.4c.1-.5.3-.9.7-1.3Z")],
  Trash2: [R(2.5, 4.5, 19, 3.6, 1.8) + R(9, 1.8, 6, 3.6, 1.8) + P("M4.6 9h14.8l-1 10.3A3 3 0 0 1 15.4 22H8.6a3 3 0 0 1-3-2.7Z"), HS("M10 12.5v5M14 12.5v5", 2)],
  Archive: [archive, HS("M9.5 13h5", 2.4)],
  ArchiveRestore: [archive, HS("M12 18.5v-6M9.5 15 12 12.5l2.5 2.5", 2.2)],
  ClipboardList: [clipboard, HS("M8 12h8M8 16.5h5")],
  CalendarCheck: [calendar, HS("m8.6 15 2.2 2.2 4.6-4.6", 2.4)],
  Eye: [P("M12 4.5c5 0 8.8 3.6 10.2 6.3.4.8.4 1.6 0 2.4C20.8 15.9 17 19.5 12 19.5S3.2 15.9 1.8 13.2a2.6 2.6 0 0 1 0-2.4C3.2 8.1 7 4.5 12 4.5Z"), HC(12, 12, 3.6)],
  EyeOff: [P("M12 4.5c5 0 8.8 3.6 10.2 6.3.4.8.4 1.6 0 2.4C20.8 15.9 17 19.5 12 19.5S3.2 15.9 1.8 13.2a2.6 2.6 0 0 1 0-2.4C3.2 8.1 7 4.5 12 4.5Z"), HS("M3.5 3.5l17 17", 4.6)],
  KeyRound: [C(8, 16, 6) + S("M12 12l8.5-8.5M17 7l2.5 2.5", 3.4), HC(8, 16, 2.2)],
  Info: [circle, HS("M12 11v5.5", 2.8) + HC(12, 7.6, 1.6)],
  Lightbulb: [P("M12 1.8a7.6 7.6 0 0 1 4.6 13.7c-.7.5-1.1 1.3-1.1 2.1H8.5c0-.8-.4-1.6-1.1-2.1A7.6 7.6 0 0 1 12 1.8Z") + R(8.5, 18.8, 7, 3.4, 1.7)],
  Ban: [circle, HS("M5.5 5.5l13 13", 3) + HC(12, 12, 6.6)],
  // alertas e proteção
  AlertTriangle: [warn, warnHole],
  TriangleAlert: [warn, warnHole],
  ShieldCheck: [shield, HS("m8.4 12 2.6 2.6 4.8-4.8", 2.6)],
  ShieldAlert: [shield, HS("M12 7.5v5", 2.8) + HC(12, 16, 1.5)],
  // sistema
  LayoutDashboard: [R(2.5, 2.5, 8.5, 11, 3.5) + R(13, 2.5, 8.5, 6.5, 3.5) + R(2.5, 15.5, 8.5, 6, 3.5) + R(13, 11, 8.5, 10.5, 3.5)],
  SlidersHorizontal: [L("M3 6.5h18M3 17.5h18", 2.6) + C(8.5, 6.5, 3.2) + C(15.5, 17.5, 3.2)],
  Monitor: [R(1.8, 3, 20.4, 14, 4.5) + S("M8 21h8M12 17v4", 3)],
  Smartphone: [phone, HR(10, 17.4, 4, 1.8, .9)],
  Moon: [P("M20.6 14.6c.9-.3 1.7.6 1.3 1.4A10 10 0 1 1 8 2.1c.8-.4 1.7.4 1.4 1.3A8 8 0 0 0 20.6 14.6Z")],
  Sun: [C(12, 12, 5.2) + L("M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6", 2.8)],
  CloudOff: [P("M7 19.5a5 5 0 0 1-.8-9.9A7 7 0 0 1 19.6 9a5.3 5.3 0 0 1-1.6 10.5Z"), HS("M4 3.5l16 17", 4)],
  Database: [P("M12 2c5 0 9 1.8 9 4v12c0 2.2-4 4-9 4s-9-1.8-9-4V6c0-2.2 4-4 9-4Z"), HS("M3.5 10c1.5 1.4 4.8 2.3 8.5 2.3s7-.9 8.5-2.3M3.5 15.5c1.5 1.4 4.8 2.3 8.5 2.3s7-.9 8.5-2.3", 1.8)],
  FlaskConical: [P("M9 2.5h6v6.3l5.6 9.4c.9 1.6-.2 3.3-2 3.3H5.4c-1.8 0-2.9-1.7-2-3.3L9 8.8Z"), HP("M6.8 15h10.4l1.6 2.8c.2.4 0 .7-.4.7H5.6c-.4 0-.6-.3-.4-.7Z")],
  Radar: [circle, HC(12, 12, 6.4)],
  MapPin: [P("M12 2a8.5 8.5 0 0 1 8.5 8.5c0 5-5.5 10.2-7.3 11.4-.7.5-1.7.5-2.4 0C9 20.7 3.5 15.5 3.5 10.5A8.5 8.5 0 0 1 12 2Z"), HC(12, 10.3, 3.3)],
  Video: [R(1.5, 5, 15, 14, 5) + P("M17.5 10.5 21 8.3c.7-.4 1.5.1 1.5.9v5.6c0 .8-.8 1.3-1.5.9l-3.5-2.2Z")],
  Volume2: [P("M3 9.2c0-.8.6-1.4 1.4-1.4h2.4l4.6-3.7c.8-.6 1.9-.1 1.9.9v14c0 1-1.1 1.5-1.9.9l-4.6-3.7H4.4c-.8 0-1.4-.6-1.4-1.4Z") + L("M16.5 8.5a5 5 0 0 1 0 7M19.5 5.5a9 9 0 0 1 0 13", 2.6)],
  VolumeX: [P("M3 9.2c0-.8.6-1.4 1.4-1.4h2.4l4.6-3.7c.8-.6 1.9-.1 1.9.9v14c0 1-1.1 1.5-1.9.9l-4.6-3.7H4.4c-.8 0-1.4-.6-1.4-1.4Z") + L("M16.5 9.5l5 5M21.5 9.5l-5 5", 2.6)],
  // equipamentos e treino (biblioteca EVO)
  Kettlebell: [P("M4.2 10.4V7.6A5.6 5.6 0 0 1 9.8 2h4.4a5.6 5.6 0 0 1 5.6 5.6v2.8Z") + P("M4.4 10.4c1.6-1.3 4.4-2 7.6-2s6 .7 7.6 2c1.5 1.3 2.2 3.2 2.2 5.4v1.4a4.8 4.8 0 0 1-4.8 4.8H7a4.8 4.8 0 0 1-4.8-4.8v-1.4c0-2.2.7-4.1 2.2-5.4Z"), HP("M7.5 9.7V8.3a2.6 2.6 0 0 1 2.6-2.6h3.8a2.6 2.6 0 0 1 2.6 2.6v1.4c-1.3-.5-2.8-.8-4.5-.8s-3.2.3-4.5.8Z")],
  WeightPlate: [C(12, 12, 10), HS("M12 5.6a6.4 6.4 0 1 0 0 12.8a6.4 6.4 0 1 0 0-12.8", 1.6) + HC(12, 12, 2.4)],
  Barbell: [R(1.2, 10.8, 21.6, 2.4, 1.2) + R(3.6, 5.2, 3.6, 13.6, 1.8) + R(16.8, 5.2, 3.6, 13.6, 1.8) + R(7.8, 7.6, 2.4, 8.8, 1.2) + R(13.8, 7.6, 2.4, 8.8, 1.2)],
  Bench: [R(2.5, 7.5, 19, 4.6, 2.3) + R(4.6, 10.5, 2.8, 10, 1.4) + R(16.6, 10.5, 2.8, 10, 1.4) + R(3, 18.6, 18, 2.4, 1.2)],
  JumpRope: [R(2.6, 2.2, 4.4, 8.6, 2.2) + R(17, 2.2, 4.4, 8.6, 2.2) + S("M4.8 10.5v2.8a7.2 7.2 0 0 0 14.4 0v-2.8", 2.6)],
  Bottle: [P("M9.3 1.8h5.4v2.4l1.5 2.4c.4.7.7 1.5.7 2.3V19a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V8.9c0-.8.3-1.6.7-2.3l1.6-2.4Z"), HR(7.4, 11.2, 9.2, 4.2, 1.2)],
  Sneaker: [P("M2.6 12.8c0-1.4 1.1-2.6 2.6-2.6h2.4l2.3-3.4c.6-.8 1.7-.9 2.4-.1l3.4 3.7 4 1.1c1.6.5 2.7 2 2.7 3.6v1.3c0 1.2-1 2.2-2.2 2.2H4.8c-1.2 0-2.2-1-2.2-2.2Z"), HS("M3.4 15.6h17.4", 1.6) + HS("M10.6 9.6l1.6 1.6M12.8 8l1.6 1.6", 1.4)],
  Scale: [R(2.5, 2.5, 19, 19, 6), HS("M7.6 10a5.2 5.2 0 0 1 8.8 0", 2.2) + HS("M12 10.6l1.6-2.4", 1.9)],
  Home: [P("M10.3 3.1c1-.9 2.4-.9 3.4 0l6.8 6c.6.5.9 1.2.9 2V18.5a3 3 0 0 1-3 3H5.6a3 3 0 0 1-3-3v-7.4c0-.8.3-1.5.9-2Z"), HR(9.8, 14, 4.4, 8.5, 2.2)],
  BarChart: [R(2.5, 2.5, 19, 19, 6), HR(6.6, 12.2, 3, 5.6, 1.5) + HR(10.5, 9.4, 3, 8.4, 1.5) + HR(14.4, 6.6, 3, 11.2, 1.5)],
  Flame: [P("M12 1.8c.7 3.1 4.3 5.1 6.1 8.7 1.6 3.1.8 7.2-2.4 9.4-1.1.8-2.4 1.3-3.7 1.3s-2.6-.5-3.7-1.3c-3.2-2.2-4-6.3-2.4-9.4.7-1.4 1.8-2.4 2.7-3.6.4 1.5 1.1 2.4 2 3-.3-3.3.4-6 1.4-8.1Z"), HP("M12 12.8c1.7 1.5 2.7 2.8 2.7 4.4a2.7 2.7 0 0 1-5.4 0c0-1.6 1-2.9 2.7-4.4Z")],
  Heart: [P("M12 21.2c-.4 0-.8-.1-1.2-.4C6.4 17.2 2.3 13.8 2.3 9.3 2.3 6.3 4.7 3.8 7.6 3.8c1.8 0 3.4.9 4.4 2.3 1-1.4 2.6-2.3 4.4-2.3 2.9 0 5.3 2.5 5.3 5.5 0 4.5-4.1 7.9-8.5 11.5-.4.3-.8.4-1.2.4Z")],
  Wallet: [R(1.5, 5, 21, 15.5, 5) + R(4, 2.5, 14, 4.5, 2.2), HC(17, 13, 1.8)],
  CheckCircle2: [circle, HS("m7.6 12.3 3 3 5.8-6", 3)],
}

function make(name: string) {
  const [body, holes = ""] = D[name]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- strokeWidth, absoluteStrokeWidth e fill vêm do lucide e são ignorados
  const Icon = forwardRef<SVGSVGElement, Props>(function EvoIconImpl({ size = 24, color, style, strokeWidth: _sw, absoluteStrokeWidth: _a, fill: _f, ...rest }, ref) {
    const id = `ei${useId().replace(/[^a-zA-Z0-9]/g, "")}`
    const css: CSSProperties = color ? { color, ...style } : (style ?? {})
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" style={css} aria-hidden={rest["aria-label"] ? undefined : true} {...rest}>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28" dangerouslySetInnerHTML={{ __html: `<rect x="-2" y="-2" width="28" height="28" fill="#000"/>${body}${holes}` }} />
        </defs>
        <rect x="-2" y="-2" width="28" height="28" fill="currentColor" mask={`url(#${id})`} />
      </svg>
    )
  })
  Icon.displayName = name
  return Icon
}

export const ArrowLeft = make("ArrowLeft"), ArrowRight = make("ArrowRight"), ArrowUp = make("ArrowUp"), ArrowDown = make("ArrowDown")
export const ChevronLeft = make("ChevronLeft"), ChevronRight = make("ChevronRight"), ChevronDown = make("ChevronDown")
export const X = make("X"), Plus = make("Plus"), Check = make("Check"), MoreHorizontal = make("MoreHorizontal")
export const Undo2 = make("Undo2"), RotateCcw = make("RotateCcw"), RefreshCw = make("RefreshCw"), History = make("History")
export const ExternalLink = make("ExternalLink"), Link2 = make("Link2"), Unlink = make("Unlink"), LogIn = make("LogIn"), LogOut = make("LogOut")
export const Download = make("Download"), Share2 = make("Share2"), Copy = make("Copy")
export const Dumbbell = make("Dumbbell"), Play = make("Play"), PlayCircle = make("PlayCircle"), Pause = make("Pause"), Timer = make("Timer"), Clock = make("Clock")
export const Activity = make("Activity"), Trophy = make("Trophy"), Medal = make("Medal"), BadgeCheck = make("BadgeCheck"), Ruler = make("Ruler"), Flag = make("Flag")
export const UserRound = make("UserRound"), UserPlus = make("UserPlus"), UserRoundPlus = make("UserRoundPlus"), Users = make("Users")
export const MessageCircle = make("MessageCircle"), MessageSquare = make("MessageSquare"), Inbox = make("Inbox"), Instagram = make("Instagram")
export const Search = make("Search"), SearchX = make("SearchX"), Pencil = make("Pencil"), Trash2 = make("Trash2"), Archive = make("Archive"), ArchiveRestore = make("ArchiveRestore")
export const ClipboardList = make("ClipboardList"), CalendarCheck = make("CalendarCheck"), Eye = make("Eye"), EyeOff = make("EyeOff"), KeyRound = make("KeyRound")
export const Info = make("Info"), Lightbulb = make("Lightbulb"), Ban = make("Ban"), AlertTriangle = make("AlertTriangle"), TriangleAlert = make("TriangleAlert")
export const ShieldCheck = make("ShieldCheck"), ShieldAlert = make("ShieldAlert"), LayoutDashboard = make("LayoutDashboard"), SlidersHorizontal = make("SlidersHorizontal")
export const Monitor = make("Monitor"), Smartphone = make("Smartphone"), Moon = make("Moon"), Sun = make("Sun"), CloudOff = make("CloudOff"), Database = make("Database")
export const FlaskConical = make("FlaskConical"), Radar = make("Radar"), MapPin = make("MapPin"), Video = make("Video"), Volume2 = make("Volume2"), VolumeX = make("VolumeX")
export const Wallet = make("Wallet"), CheckCircle2 = make("CheckCircle2")
export const Kettlebell = make("Kettlebell"), WeightPlate = make("WeightPlate"), Barbell = make("Barbell"), Bench = make("Bench"), JumpRope = make("JumpRope"), Bottle = make("Bottle")
export const Sneaker = make("Sneaker"), Scale = make("Scale"), Home = make("Home"), BarChart = make("BarChart"), Flame = make("Flame"), Heart = make("Heart")
