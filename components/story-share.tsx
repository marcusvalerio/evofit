"use client"
import { useEffect, useRef, useState } from "react"
import { Modal, cx } from "@/components/ui"
import { Share2 } from "@/components/icons"
import { useToast } from "@/components/providers"
import {
  TEMPLATE_INFO,
  availableTemplates,
  drawStory,
  loadStoryFonts,
  renderStory,
  shareStoryPng,
  storyAlt,
  type StoryData,
  type StoryPhoto,
  type StoryTemplate,
} from "@/lib/story-card"

/** Folha de compartilhamento nos stories: prévia, modelo, foto e o botão de compartilhar fixo embaixo. */
export function StoryShareSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: StoryData }) {
  const templates = availableTemplates(data)
  const [t, setT] = useState<StoryTemplate>(templates[0])
  const [photo, setPhoto] = useState<StoryPhoto>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const tpl = templates.includes(t) ? t : templates[0]

  useEffect(() => {
    if (!open) return
    let alive = true
    let url: string | null = null
    void (async () => {
      await loadStoryFonts()
      if (!alive) return
      const c = document.createElement("canvas")
      drawStory(c, tpl, data, photo)
      c.toBlob((b) => {
        if (!alive || !b) return
        url = URL.createObjectURL(b)
        setPreview(url)
      }, "image/png")
    })()
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, tpl, data, photo])

  function pickPhoto(f: File | undefined) {
    if (!f) return
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => {
      setPhoto(img)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => toast("Não foi possível abrir essa foto.", "error")
    img.src = url
  }

  async function share() {
    setBusy(true)
    try {
      const blob = await renderStory(tpl, data, photo)
      if (!blob) throw new Error("png")
      const r = await shareStoryPng(blob, tpl)
      if (r === "downloaded") toast("Imagem salva. Publique nos stories pelo app do Instagram.", "success")
    } catch {
      toast("Não foi possível gerar a imagem.", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartilhar nos stories"
      description="Escolha o modelo e, se quiser, uma foto sua de fundo."
      footer={
        <button type="button" className="evo-student-primary-action !mt-0" onClick={() => void share()} disabled={busy} aria-busy={busy}>
          <Share2 size={18} aria-hidden /> {busy ? "Gerando imagem…" : "Compartilhar nos stories"}
        </button>
      }
    >
      <div className="story-sheet text-left">
        <div className="story-prev">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia gerada no canvas (blob) */}
          {preview ? <img src={preview} alt={storyAlt(tpl, data)} width={1080} height={1920} /> : <div className="story-prev-ph" role="img" aria-label="Gerando prévia" />}
        </div>
        <fieldset className="mt-4">
          <legend className="field-label">Modelo</legend>
          <div className={cx("story-models", templates.length === 3 && "is-3")}>
            {templates.map((k) => (
              <button key={k} type="button" aria-pressed={k === tpl} className="story-model" onClick={() => setT(k)}>
                <b>{TEMPLATE_INFO[k].name}</b>
                <span>{TEMPLATE_INFO[k].hint}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="field-label">Fundo</legend>
          <div className="story-models">
            <button type="button" className="story-model" aria-pressed={!!photo} onClick={() => fileRef.current?.click()}>
              <b>{photo ? "Trocar foto" : "Usar foto"}</b>
              <span>Da galeria ou câmera</span>
            </button>
            <button type="button" className="story-model" aria-pressed={!photo} onClick={() => setPhoto(null)}>
              <b>Sem foto</b>
              <span>Degradê evofit</span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              pickPhoto(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </fieldset>
      </div>
    </Modal>
  )
}
