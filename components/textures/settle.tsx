// Settle — a Texture by Textures · https://textures.dev/s/settle
// Install another: npx shadcn@latest add https://textures.dev/r/<slug>.json
// For agents: https://textures.md
// License: free to use
"use client"
import { type CSSProperties, useEffect, useRef } from "react"
function selfSize(root: HTMLElement | null): void {
	const host = root?.parentElement
	if (!root || !host || host.getBoundingClientRect().height > 0) return
	root.style.minHeight = "240px"
}
type Pointer = { x: number; y: number; active: number; reduced: boolean }
const AMBIENT_SPEED = 1.5
const AMBIENT_CYCLE = 4.5
type EngineOptions = { ambientSpeed?: number }
function engine(
	root: HTMLElement,
	draw: (p: Pointer, dt: number) => boolean | void,
	min: [number, number],
	options: EngineOptions = {},
): () => void {
	const svg = root.querySelector("svg")
	if (!svg) return () => {}
	const mq = () => matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(update: slow)").matches
	const touchMq = matchMedia("(hover: none), (pointer: coarse)")
	const forced = () => root.closest("[data-motion]")?.getAttribute("data-motion") ?? null
	const wantsAmbient = () => (forced() ? forced() === "ambient" : touchMq.matches)
	const speed = AMBIENT_SPEED * (options.ambientSpeed ?? 1)
	const w = (2 * Math.PI) / AMBIENT_CYCLE
	const phase = Math.random() * 2 * Math.PI
	let onScreen = false
	let ambient = false
	let clock = 0
	let hold = 0
	let box: { left: number; top: number; s: number; ox: number; oy: number } | null = null
	let px = 366
	let py = 258
	let cx = 0
	let cy = 0
	let active = 0
	let target = 0
	let vel = 0
	let frame = 0
	let last = 0
	let lastMoveAt = 0
	const measure = () => {
		const r = svg.getBoundingClientRect()
		if (r.width < min[0] || r.height < min[1]) {
			box = null
			return
		}
		const s = Math.max(r.width / 732, r.height / 516)
		box = { left: r.left, top: r.top, s, ox: (r.width - 732 * s) / 2, oy: (r.height - 516 * s) / 2 }
	}
	const tick = (now: number) => {
		const dt = Math.min(last ? (now - last) / 1000 : 1 / 60, 1 / 30)
		last = now
		let moving = false
		const reduced = mq()
		if (ambient && now > hold) {
			if (reduced) target = 0
			else {
				clock += dt * speed
				const t = clock
				px = 366 + 366 * (0.76 * Math.sin(w * t + phase) + 0.2 * Math.sin(1.93 * w * t + 1.2 + phase))
				py = 258 + 258 * (0.72 * Math.sin(0.75 * w * t + 0.8 + phase) + 0.2 * Math.sin(1.37 * w * t + 2.1 + phase))
				target = 1
				moving = true
			}
		}
		if (reduced) {
			active = target
			vel = 0
		} else {
			const decay = Math.exp(-30 * dt)
			const off = active - target
			const lead = vel + 30 * off
			active = target + (off + lead * dt) * decay
			vel = (vel - 30 * lead * dt) * decay
			if (Math.abs(vel) < 0.02 && Math.abs(active - target) < 0.02) {
				active = target
				vel = 0
			} else moving = true
		}
		const more = draw({ x: px, y: py, active, reduced }, dt)
		if (moving || more) frame = requestAnimationFrame(tick)
		else {
			frame = 0
			last = 0
		}
	}
	const wake = () => {
		if (!frame) frame = requestAnimationFrame(tick)
	}
	const touchIsAmbient = (e: Event) => (e as PointerEvent).pointerType === "touch" && touchMq.matches
	const onEnter = (e: PointerEvent) => {
		if (touchIsAmbient(e)) return
		measure()
	}
	const onMove = (e: PointerEvent) => {
		if (touchIsAmbient(e)) return
		const t = performance.now()
		if (!box || t - lastMoveAt > 250) measure()
		lastMoveAt = t
		if (!box) return
		if (!e.isTrusted) hold = performance.now() + 1000
		cx = e.clientX
		cy = e.clientY
		px = (cx - box.left - box.ox) / box.s
		py = (cy - box.top - box.oy) / box.s
		target = 1
		wake()
	}
	const onLeave = (e?: Event) => {
		if (e && touchIsAmbient(e)) return
		if (e && !e.isTrusted) hold = 0
		if (ambient && performance.now() > hold) return
		target = 0
		wake()
	}
	const onFocus = () => {
		measure()
		if (!box) return
		px = 366
		py = 258
		target = 1
		wake()
	}
	const onResize = () => {
		if (box || ambient) measure()
		if (ambient && !box) ambient = false
		settle()
	}
	const onScroll = () => {
		if (!box || target !== 1 || (ambient && performance.now() > hold)) return
		measure()
		if (!box) return
		px = (cx - box.left - box.ox) / box.s
		py = (cy - box.top - box.oy) / box.s
		wake()
	}
	const settle = () => {
		const next = onScreen && !document.hidden && wantsAmbient()
		if (next === ambient) return
		ambient = next
		if (ambient) {
			measure()
			if (!box) {
				ambient = false
				return
			}
			wake()
		} else {
			target = 0
			wake()
		}
	}
	const io =
		typeof IntersectionObserver === "function"
			? new IntersectionObserver(
					([entry]) => {
						onScreen = !!entry?.isIntersecting
						settle()
					},
					{ threshold: 0.2 },
				)
			: null
	io?.observe(svg)
	if (!io) {
		onScreen = true
		settle()
	}
	const onVisibility = () => settle()
	const onCapability = () => settle()
	const reducedMq = matchMedia("(prefers-reduced-motion: reduce)")
	const onReduced = () => wake()
	document.addEventListener("visibilitychange", onVisibility)
	touchMq.addEventListener?.("change", onCapability)
	reducedMq.addEventListener?.("change", onReduced)
	const host: Element = root.closest("a, button, [tabindex]") ?? root.parentElement ?? root
	root.addEventListener("pointerenter", onEnter)
	root.addEventListener("pointermove", onMove, { passive: true })
	root.addEventListener("pointerleave", onLeave)
	root.addEventListener("pointercancel", onLeave)
	host.addEventListener("focusin", onFocus)
	host.addEventListener("focusout", onLeave)
	window.addEventListener("resize", onResize, { passive: true })
	window.addEventListener("scroll", onScroll, { passive: true, capture: true })
	return () => {
		root.removeEventListener("pointerenter", onEnter)
		root.removeEventListener("pointermove", onMove)
		root.removeEventListener("pointerleave", onLeave)
		root.removeEventListener("pointercancel", onLeave)
		host.removeEventListener("focusin", onFocus)
		host.removeEventListener("focusout", onLeave)
		window.removeEventListener("resize", onResize)
		window.removeEventListener("scroll", onScroll, { capture: true })
		document.removeEventListener("visibilitychange", onVisibility)
		touchMq.removeEventListener?.("change", onCapability)
		reducedMq.removeEventListener?.("change", onReduced)
		io?.disconnect()
		if (frame) cancelAnimationFrame(frame)
	}
}
const W = 732
const H = 516
const BAR_W = 31.287
const BAR_H = 8.683
const COLS: [number, number[]][] = [
	[17, [47.17, 100.05, 150.79, 197.26, 241.59, 282.18, 320.1, 353.22, 383.13, 411.44, 434.4, 455.23, 473.93, 491.29]],
	[52.04, [64.54, 116.88, 167.09, 214.62, 257.35, 299.55, 336.4, 370.58, 401.56, 428.8, 452.3, 473.67, 491.29]],
	[87.08, [26.61, 81.09, 135.57, 186.32, 232.78, 277.11, 318.78, 355.63, 388.74, 419.72, 448.03, 469.93, 491.29]],
	[122.11, [49.58, 103.53, 156.4, 207.68, 254.68, 298.48, 340.14, 376.46, 410.64, 441.09, 469.39, 491.29]],
	[157.15, [73.08, 129.7, 183.64, 233.32, 280.85, 323.05, 365.24, 401.56, 437.35, 467.26, 491.29]],
	[192.19, [42.1, 102.46, 158.01, 211.42, 262.16, 308.63, 352.96, 392.48, 432.01, 464.59, 491.29]],
	[227.23, [73.08, 132.9, 188.98, 242.93, 293.67, 341.21, 383.4, 424.53, 462.45, 491.29]],
	[262.26, [44.24, 104.6, 166.02, 222.1, 276.05, 325.72, 373.25, 416.52, 458.18, 491.29]],
	[297.3, [17, 81.09, 144.12, 202.34, 257.89, 363.11, 408.51, 450.7, 491.29]],
	[332.34, [54.92, 120.62, 184.18, 245.07, 300.08, 351.89, 403.17, 448.56, 491.29]],
	[367.38, [17, 59.73, 105.13, 156.4, 208.21, 263.23, 324.11, 387.67, 453.37]],
	[402.41, [17, 57.59, 99.79, 145.19, 250.41, 305.96, 364.17, 427.2, 491.29]],
	[437.45, [17, 50.11, 91.78, 135.04, 182.57, 232.25, 286.19, 342.28, 403.7, 464.05]],
	[472.49, [17, 45.84, 83.76, 124.89, 167.09, 214.62, 265.36, 319.31, 375.39, 435.21]],
	[507.53, [17, 43.7, 76.29, 115.81, 155.33, 199.67, 246.13, 296.87, 350.29, 405.83, 466.19]],
	[542.56, [17, 41.04, 70.95, 106.73, 143.05, 185.25, 227.44, 274.98, 324.65, 378.6, 435.21]],
	[577.6, [17, 38.9, 67.21, 97.65, 131.83, 168.15, 209.82, 253.61, 300.61, 351.89, 404.77, 458.71]],
	[612.64, [17, 38.36, 60.26, 88.57, 119.55, 152.66, 189.52, 231.18, 275.51, 321.98, 372.72, 427.2, 481.68]],
	[647.68, [17, 34.63, 55.99, 79.49, 106.73, 137.71, 171.89, 208.75, 250.94, 293.67, 341.21, 391.41, 443.76]],
	[682.71, [17, 34.36, 53.06, 73.89, 96.86, 125.16, 155.08, 188.19, 226.11, 266.71, 311.04, 357.5, 408.24, 461.12]],
]
export type SettleProps = {
	tokens?: Partial<Record<"--texture-ink" | "--texture-field", string>>
	className?: string
	static?: boolean
}
const GAP = BAR_H + 2
const SIGMA_X = 90
const SIGMA_Y = 130
const PULL = 0.85
const EASE = 0.32
export function Settle({ tokens, className = "", static: isStatic = false }: SettleProps) {
	const ref = useRef<HTMLDivElement>(null)
	useEffect(() => selfSize(ref.current), [])
	const rects = useRef<(SVGRectElement | null)[][]>(COLS.map(() => []))
	useEffect(() => {
		const root = ref.current
		if (!root || isStatic) return
		const ys = COLS.map(([, tops]) => [...tops])
		const targets = COLS.map(([, tops]) => [...tops])
		return engine(
			root,
			({ x, y, active, reduced }, dt) => {
				let moving = false
				const k = reduced ? 1 : 1 - (1 - EASE) ** (dt * 60)
				COLS.forEach(([cx, tops], i) => {
					const t = targets[i]!
					const cur = ys[i]!
					const dx = cx + BAR_W / 2 - x
					const wx = Math.exp(-(dx * dx) / (2 * SIGMA_X * SIGMA_X))
					tops.forEach((top, j) => {
						const dy = y - (top + BAR_H / 2)
						const wy = Math.exp(-(dy * dy) / (2 * SIGMA_Y * SIGMA_Y))
						t[j] = top + dy * wx * wy * PULL * active
					})
					for (let j = 1; j < t.length; j++) if (t[j]! < t[j - 1]! + GAP) t[j] = t[j - 1]! + GAP
					for (let j = t.length - 2; j >= 0; j--) if (t[j]! > t[j + 1]! - GAP) t[j] = t[j + 1]! - GAP
					for (let j = 0; j < t.length; j++) {
						const d = t[j]! - cur[j]!
						const el = rects.current[i]![j]
						if (Math.abs(d) < 0.03) {
							if (cur[j] !== t[j]) {
								cur[j] = t[j]!
								if (el) el.style.transform = `translateY(${(cur[j]! - tops[j]!).toFixed(2)}px)`
							}
							continue
						}
						cur[j] = cur[j]! + d * k
						if (el) el.style.transform = `translateY(${(cur[j]! - tops[j]!).toFixed(2)}px)`
						moving = true
					}
				})
				return moving
			},
			[160, 112],
		)
	}, [isStatic])
	const style = {
		"--texture-ink": "var(--foreground)",
		"--texture-field": "var(--background)",
		...tokens,
		color: "var(--texture-ink)",
		background: "var(--texture-field)",
	} as CSSProperties
	return (
		<div
			ref={ref}
			style={{
				position: "relative",
				isolation: "isolate",
				height: "100%",
				width: "100%",
				overflow: "clip",
				contain: "layout paint style",
				containerType: "size",
				...style,
			}}
			data-texture="settle"
			className={className}
		>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
				focusable="false"
				fill="currentColor"
				style={{ position: "absolute", inset: 0, display: "block", height: "100%", width: "100%" }}
			>
				{COLS.map(([x, tops], i) =>
					tops.map((top, j) => (
						<rect
							key={`${i}-${j}`}
							ref={(el) => {
								rects.current[i]![j] = el
							}}
							x={x}
							y={top}
							width={BAR_W}
							height={BAR_H}
							style={{ transformBox: "fill-box", transformOrigin: "center" }}
						/>
					)),
				)}
			</svg>
		</div>
	)
}
