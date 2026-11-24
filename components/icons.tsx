/**
 * Ícones evofit v3: linha com traço 1,75 numa grade de 24, pontas redondas (ver Design System).
 * Mantém os nomes e props usados antes (size, className, color, strokeWidth, aria-*).
 * Os itens da navegação (Home, ClipboardList, BarChart, UserRound, Play) têm versão cheia: prop `filled`.
 */
import { forwardRef, type CSSProperties, type SVGProps } from "react"

type Props = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  color?: string
  filled?: boolean
}

const D: Record<string, string> = {
  Bell: "<path d=\"M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15Z\"/><path d=\"M10 20.5h4\"/>",
  ArrowLeft: "<path d=\"M19 12H5M11 5.5 4.5 12l6.5 6.5\"/>",
  ArrowRight: "<path d=\"M5 12h14M13 5.5l6.5 6.5-6.5 6.5\"/>",
  ArrowUp: "<path d=\"M12 19V5M5.5 11 12 4.5l6.5 6.5\"/>",
  ArrowDown: "<path d=\"M12 5v14M5.5 13l6.5 6.5 6.5-6.5\"/>",
  ChevronLeft: "<path d=\"m15 5.5-6.5 6.5 6.5 6.5\"/>",
  ChevronRight: "<path d=\"m9 5.5 6.5 6.5L9 18.5\"/>",
  ChevronDown: "<path d=\"m5.5 9 6.5 6.5L18.5 9\"/>",
  X: "<path d=\"M6 6l12 12M18 6 6 18\"/>",
  Plus: "<path d=\"M12 5v14M5 12h14\"/>",
  Check: "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>",
  MoreHorizontal: "<circle cx=\"5\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/><circle cx=\"19\" cy=\"12\" r=\"1.2\" fill=\"currentColor\"/>",
  Undo2: "<path d=\"M9 4.5 4.5 9 9 13.5M4.5 9h10a5 5 0 0 1 0 10H11\"/>",
  RotateCcw: "<path d=\"M4.5 4.5v5h5M5.2 9.5A8 8 0 1 1 4 13\"/>",
  RefreshCw: "<path d=\"M19.5 4.5v5h-5M4.5 19.5v-5h5M18.8 9.5A7.5 7.5 0 0 0 5.6 8M5.2 14.5A7.5 7.5 0 0 0 18.4 16\"/>",
  History: "<path d=\"M4.5 4.5v5h5M5.2 9.5A8 8 0 1 1 4 13M12 8v4l2.5 1.8\"/>",
  ExternalLink: "<path d=\"M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4\"/>",
  Link2: "<path d=\"M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M8.5 12h7\"/>",
  Unlink: "<path d=\"M9 7H7a5 5 0 0 0 0 10h2M15 7h2a5 5 0 0 1 0 10h-2M12 4v2.5M12 17.5V20\"/>",
  LogIn: "<path d=\"M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h10M10 7.5 14.5 12 10 16.5\"/>",
  LogOut: "<path d=\"M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M10 12h10M15.5 7.5 20 12l-4.5 4.5\"/>",
  Download: "<path d=\"M12 4v11M7 10.5l5 5 5-5M5 20h14\"/>",
  Share2: "<path d=\"M12 15V4M8 7.5 12 3.5l4 4M8 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4A2.5 2.5 0 0 0 17.5 11H16\"/>",
  Copy: "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"3\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/>",
  Dumbbell: "<rect x=\"3\" y=\"7\" width=\"4.5\" height=\"10\" rx=\"1.6\"/><rect x=\"16.5\" y=\"7\" width=\"4.5\" height=\"10\" rx=\"1.6\"/><path d=\"M7.5 12h9M1.5 12H3M21 12h1.5\"/>",
  Play: "<path d=\"M8 5.6v12.8a1 1 0 0 0 1.5.9l9.9-6.4a1 1 0 0 0 0-1.7L9.5 4.7A1 1 0 0 0 8 5.6Z\"/>",
  PlayCircle: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M10.2 9v6l5-3Z\"/>",
  Pause: "<path d=\"M9 5.5v13M15 5.5v13\"/>",
  Timer: "<circle cx=\"12\" cy=\"13.5\" r=\"7\"/><path d=\"M12 10v3.5l2.2 1.8M10 3h4\"/>",
  Clock: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>",
  Activity: "<path d=\"M3 12h4l3-7 4 14 3-7h4\"/>",
  Trophy: "<path d=\"M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z\"/><path d=\"M7.5 6H5v.8A3.2 3.2 0 0 0 7.9 10M16.5 6H19v.8a3.2 3.2 0 0 1-2.9 3.2M12 13.5V17M8.5 20h7M9.5 20l.5-3h4l.5 3\"/>",
  Medal: "<path d=\"M8.5 3 11 8.6M15.5 3 13 8.6\"/><circle cx=\"12\" cy=\"14.5\" r=\"5.5\"/><path d=\"m12 12.2.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2Z\"/>",
  BadgeCheck: "<path d=\"m12 3 2.3 1.8 2.9-.3.8 2.8 2.5 1.5-1 2.7 1 2.7-2.5 1.5-.8 2.8-2.9-.3L12 21l-2.3-1.8-2.9.3-.8-2.8-2.5-1.5 1-2.7-1-2.7 2.5-1.5.8-2.8 2.9.3Z\"/><path d=\"m8.8 12.2 2.2 2.2 4.2-4.4\"/>",
  Ruler: "<rect x=\"3\" y=\"8\" width=\"18\" height=\"8\" rx=\"2\"/><path d=\"M7 8v3M11 8v4M15 8v3M19 8v2\"/>",
  Flag: "<path d=\"M5 21V4M5 4h11l-2 4 2 4H5\"/>",
  UserRound: "<circle cx=\"12\" cy=\"8\" r=\"3.75\"/><path d=\"M4.5 20c.9-3.6 3.8-5.5 7.5-5.5s6.6 1.9 7.5 5.5\"/>",
  UserPlus: "<circle cx=\"10\" cy=\"8\" r=\"3.5\"/><path d=\"M3.5 20c.8-3.4 3.4-5.2 6.5-5.2 1.7 0 3.2.5 4.4 1.5M18 13v6M15 16h6\"/>",
  Users: "<circle cx=\"9\" cy=\"8.5\" r=\"3.25\"/><path d=\"M3 19.5c.7-3.2 3.1-4.8 6-4.8s5.3 1.6 6 4.8M15.5 5.6a3.25 3.25 0 0 1 0 5.8M18 14.9c1.6.7 2.6 2.2 3 4.6\"/>",
  MessageCircle: "<path d=\"M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10L5 20Z\"/><path d=\"M9 8.5h6M9 11.5h4\"/>",
  MessageSquare: "<path d=\"M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10L5 20Z\"/><path d=\"M9 8.5h6M9 11.5h4\"/>",
  Inbox: "<path d=\"M4 13h4.5l1.5 2.5h4l1.5-2.5H20\"/><path d=\"M6.5 5h11L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z\"/>",
  Instagram: "<rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"17\" cy=\"7\" r=\".9\" fill=\"currentColor\"/>",
  Search: "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m16 16 4 4\"/>",
  SearchX: "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m16 16 4 4M9 9l4 4M13 9l-4 4\"/>",
  Pencil: "<path d=\"M15 4.5 19.5 9 9 19.5 4 20l.5-5Z\"/>",
  Camera: "<path d=\"M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2.5h5.6L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>",
  Trash2: "<path d=\"M4 7h16M10 3.5h4M6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7M10 11v6M14 11v6\"/>",
  Archive: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"5\" rx=\"1.5\"/><path d=\"M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4\"/>",
  ArchiveRestore: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"5\" rx=\"1.5\"/><path d=\"M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M12 17v-5M9.5 14.5 12 12l2.5 2.5\"/>",
  ClipboardList: "<rect x=\"5\" y=\"3.5\" width=\"14\" height=\"17\" rx=\"3\"/><path d=\"M9 8.5h6M9 12h6M9 15.5h3.5\"/>",
  CalendarCheck: "<rect x=\"4\" y=\"5\" width=\"16\" height=\"15\" rx=\"3.5\"/><path d=\"M8 3v4M16 3v4M4 10h16M9 14.5l2 2 4-4\"/>",
  Eye: "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  EyeOff: "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z\"/><path d=\"M4 4l16 16\"/>",
  KeyRound: "<circle cx=\"8\" cy=\"15\" r=\"4.5\"/><path d=\"m11.5 11.5 8-8M16.5 6.5l2.5 2.5\"/>",
  Info: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5.5\"/><circle cx=\"12\" cy=\"7.8\" r=\".9\" fill=\"currentColor\"/>",
  Lightbulb: "<path d=\"M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z\"/>",
  Ban: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"m6 6 12 12\"/>",
  AlertTriangle: "<path d=\"M10.3 4.2a2 2 0 0 1 3.4 0l7.5 13a2 2 0 0 1-1.7 3H4.5a2 2 0 0 1-1.7-3Z\"/><path d=\"M12 9.5v4\"/><circle cx=\"12\" cy=\"16.8\" r=\".9\" fill=\"currentColor\"/>",
  ShieldCheck: "<path d=\"M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6Z\"/><path d=\"m9 12 2.2 2.2L15.5 10\"/>",
  ShieldAlert: "<path d=\"M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6Z\"/><path d=\"M12 8v4.5\"/><circle cx=\"12\" cy=\"15.6\" r=\".9\" fill=\"currentColor\"/>",
  LayoutDashboard: "<rect x=\"3.5\" y=\"3.5\" width=\"7\" height=\"9\" rx=\"2\"/><rect x=\"13.5\" y=\"3.5\" width=\"7\" height=\"5\" rx=\"2\"/><rect x=\"3.5\" y=\"15.5\" width=\"7\" height=\"5\" rx=\"2\"/><rect x=\"13.5\" y=\"11.5\" width=\"7\" height=\"9\" rx=\"2\"/>",
  SlidersHorizontal: "<path d=\"M4 7h16M4 17h16\"/><circle cx=\"9\" cy=\"7\" r=\"2.2\" fill=\"var(--bg,#fff)\"/><circle cx=\"15\" cy=\"17\" r=\"2.2\" fill=\"var(--bg,#fff)\"/>",
  Monitor: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"3\"/><path d=\"M8 20h8M12 16v4\"/>",
  Smartphone: "<rect x=\"6.5\" y=\"2.5\" width=\"11\" height=\"19\" rx=\"3\"/><path d=\"M11 18.5h2\"/>",
  Moon: "<path d=\"M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z\"/>",
  Sun: "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4\"/>",
  CloudOff: "<path d=\"M7 19h10.5a4 4 0 0 0 .6-8A6.5 6.5 0 0 0 6.3 9.6 4.8 4.8 0 0 0 7 19Z\"/><path d=\"M4 4l16 16\"/>",
  Database: "<ellipse cx=\"12\" cy=\"6\" rx=\"7.5\" ry=\"3\"/><path d=\"M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3\"/>",
  FlaskConical: "<path d=\"M9.5 3h5M10 3v6l-5.4 9.3A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.7L14 9V3M7.5 15h9\"/>",
  Radar: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"4.5\"/><path d=\"m12 12 6-6\"/><circle cx=\"15.5\" cy=\"15\" r=\".9\" fill=\"currentColor\"/>",
  MapPin: "<path d=\"M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
  Video: "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3.5\"/><path d=\"M10.2 9.2v5.6l4.6-2.8Z\"/>",
  Volume2: "<path d=\"M4 9.5v5h3.5L12 18V6L7.5 9.5Z\"/><path d=\"M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11\"/>",
  VolumeX: "<path d=\"M4 9.5v5h3.5L12 18V6L7.5 9.5Z\"/><path d=\"m16 9.5 5 5M21 9.5l-5 5\"/>",
  Wallet: "<rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"3.5\"/><path d=\"M6 6V5a2 2 0 0 1 2-2h8M16 13h2\"/>",
  CheckCircle2: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"m8.5 12.3 2.4 2.4 4.6-5\"/>",
  Kettlebell: "<path d=\"M8.5 9V7.5a3.5 3.5 0 0 1 7 0V9\"/><path d=\"M6 15a6 6 0 0 1 12 0v3.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18.5Z\"/>",
  WeightPlate: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
  Barbell: "<rect x=\"3\" y=\"7\" width=\"4.5\" height=\"10\" rx=\"1.6\"/><rect x=\"16.5\" y=\"7\" width=\"4.5\" height=\"10\" rx=\"1.6\"/><path d=\"M7.5 12h9M1.5 12H3M21 12h1.5\"/>",
  Bench: "<path d=\"M3 9h18M6 9v8M18 9v8M4 17h4M16 17h4\"/>",
  JumpRope: "<path d=\"M5 3v6M19 3v6M5 9v3a7 7 0 0 0 14 0V9\"/>",
  Bottle: "<path d=\"M10 3h4v2.5l1.5 2.5V19a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8L10 5.5ZM8.5 12h7\"/>",
  Sneaker: "<path d=\"M3 15c0-3.5.8-7 2.5-8.5l2.5 1.7c1.5 1 3 1 4.3-.1l1-.8 4.7 4.2c2.5.5 3.5 1.8 3.5 4V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM3 15.5h18\"/>",
  Scale: "<rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"4.5\"/><path d=\"M8 10a5 5 0 0 1 8 0M12 10.5l1.5-2\"/>",
  Home: "<path d=\"M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1Z\"/>",
  BarChart: "<path d=\"M4 20h16M7 16.5v-3M12 16.5v-7M17 16.5V5.5\"/>",
  Flame: "<path d=\"M12 3.5c.9 3.6 5.5 5.6 5.5 10.2a5.5 5.5 0 0 1-11 0c0-2.8 1.8-3.9 1.8-5.6 1.9.9 2.7 2.8 2.7 2.8s1-3.3 1-7.4Z\"/>",
  Heart: "<path d=\"M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20Z\"/>",
  MedicineBall: "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M4 10c5.3 1.8 10.7 1.8 16 0M4 14c5.3-1.8 10.7-1.8 16 0\"/>",
  Shaker: "<path d=\"M7.5 3h9M7 6h10l-1 13.5a1.8 1.8 0 0 1-1.8 1.5H9.8A1.8 1.8 0 0 1 8 19.5ZM9 12h6\"/>",
  PlyoBox: "<path d=\"M4 8 6 4h12l2 4v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19ZM4 8h16M9.5 13.5h5\"/>",
  YogaMat: "<circle cx=\"7\" cy=\"15\" r=\"4\"/><path d=\"M7 11h13v8H7\"/>",
  PullUpBar: "<path d=\"M3 5h18M6 5v15M18 5v15\"/>",
  UserRoundPlus: "<circle cx=\"10\" cy=\"8\" r=\"3.5\"/><path d=\"M3.5 20c.8-3.4 3.4-5.2 6.5-5.2 1.7 0 3.2.5 4.4 1.5M18 13v6M15 16h6\"/>",
  TriangleAlert: "<path d=\"M10.3 4.2a2 2 0 0 1 3.4 0l7.5 13a2 2 0 0 1-1.7 3H4.5a2 2 0 0 1-1.7-3Z\"/><path d=\"M12 9.5v4\"/><circle cx=\"12\" cy=\"16.8\" r=\".9\" fill=\"currentColor\"/>",
}
const F: Record<string, string> = {
  Home: "<path d=\"M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1Z\" fill=\"currentColor\"/>",
  ClipboardList: "<rect x=\"5\" y=\"3.5\" width=\"14\" height=\"17\" rx=\"3\" fill=\"currentColor\"/><path d=\"M9 8.5h6M9 12h6M9 15.5h3.5\" stroke=\"var(--icon-knock,#fff)\"/>",
  BarChart: "<path d=\"M4 20h16\"/><path d=\"M7 16.5v-3M12 16.5v-7M17 16.5V5.5\" stroke-width=\"3\"/>",
  UserRound: "<circle cx=\"12\" cy=\"8\" r=\"4\" fill=\"currentColor\"/><path d=\"M4.5 20c.9-3.6 3.8-5.5 7.5-5.5s6.6 1.9 7.5 5.5Z\" fill=\"currentColor\"/>",
  Play: "<path d=\"M8 5.6v12.8a1 1 0 0 0 1.5.9l9.9-6.4a1 1 0 0 0 0-1.7L9.5 4.7A1 1 0 0 0 8 5.6Z\" fill=\"currentColor\"/>",
}

function make(name: string) {
  const Icon = forwardRef<SVGSVGElement, Props>(function EvoIconImpl(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- absoluteStrokeWidth vem da API antiga e é ignorado
    { size = 24, color, style, strokeWidth = 1.75, absoluteStrokeWidth: _a, filled = false, ...rest },
    ref,
  ) {
    const css: CSSProperties = color ? { color, ...style } : (style ?? {})
    const body = filled && F[name] ? F[name] : D[name]
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={css}
        aria-hidden={rest["aria-label"] ? undefined : true}
        {...rest}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    )
  })
  Icon.displayName = name
  return Icon
}
export type EvoIcon = ReturnType<typeof make>
export type LucideIcon = EvoIcon

export const ArrowLeft = make("ArrowLeft"), ArrowRight = make("ArrowRight"), ArrowUp = make("ArrowUp"), ArrowDown = make("ArrowDown"), ChevronLeft = make("ChevronLeft"), ChevronRight = make("ChevronRight")
export const ChevronDown = make("ChevronDown"), X = make("X"), Plus = make("Plus"), Check = make("Check"), MoreHorizontal = make("MoreHorizontal"), Undo2 = make("Undo2")
export const RotateCcw = make("RotateCcw"), RefreshCw = make("RefreshCw"), History = make("History"), ExternalLink = make("ExternalLink"), Link2 = make("Link2"), Unlink = make("Unlink")
export const LogIn = make("LogIn"), LogOut = make("LogOut"), Download = make("Download"), Share2 = make("Share2"), Copy = make("Copy"), Dumbbell = make("Dumbbell")
export const Play = make("Play"), PlayCircle = make("PlayCircle"), Pause = make("Pause"), Timer = make("Timer"), Clock = make("Clock"), Activity = make("Activity")
export const Trophy = make("Trophy"), Medal = make("Medal"), BadgeCheck = make("BadgeCheck"), Ruler = make("Ruler"), Flag = make("Flag"), UserRound = make("UserRound")
export const UserPlus = make("UserPlus"), Users = make("Users"), MessageCircle = make("MessageCircle"), MessageSquare = make("MessageSquare"), Inbox = make("Inbox"), Instagram = make("Instagram")
export const Search = make("Search"), SearchX = make("SearchX"), Pencil = make("Pencil"), Trash2 = make("Trash2"), Archive = make("Archive"), ArchiveRestore = make("ArchiveRestore")
export const ClipboardList = make("ClipboardList"), CalendarCheck = make("CalendarCheck"), Eye = make("Eye"), EyeOff = make("EyeOff"), KeyRound = make("KeyRound"), Info = make("Info")
export const Lightbulb = make("Lightbulb"), Ban = make("Ban"), AlertTriangle = make("AlertTriangle"), ShieldCheck = make("ShieldCheck"), ShieldAlert = make("ShieldAlert"), LayoutDashboard = make("LayoutDashboard")
export const SlidersHorizontal = make("SlidersHorizontal"), Monitor = make("Monitor"), Smartphone = make("Smartphone"), Moon = make("Moon"), Sun = make("Sun"), CloudOff = make("CloudOff")
export const Database = make("Database"), FlaskConical = make("FlaskConical"), Radar = make("Radar"), MapPin = make("MapPin"), Video = make("Video"), Volume2 = make("Volume2")
export const VolumeX = make("VolumeX"), Wallet = make("Wallet"), CheckCircle2 = make("CheckCircle2"), Kettlebell = make("Kettlebell"), WeightPlate = make("WeightPlate"), Barbell = make("Barbell")
export const Bench = make("Bench"), JumpRope = make("JumpRope"), Bottle = make("Bottle"), Sneaker = make("Sneaker"), Scale = make("Scale"), Home = make("Home")
export const BarChart = make("BarChart"), Flame = make("Flame"), Heart = make("Heart"), MedicineBall = make("MedicineBall"), Shaker = make("Shaker"), PlyoBox = make("PlyoBox")
export const YogaMat = make("YogaMat"), PullUpBar = make("PullUpBar"), UserRoundPlus = make("UserRoundPlus"), TriangleAlert = make("TriangleAlert")
export const Bell = make("Bell"), Camera = make("Camera")
