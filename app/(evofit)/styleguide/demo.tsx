'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ToastProvider, useToast } from '@/components/ui/toast'

function Buttons() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        loading={loading}
        onClick={() => {
          setLoading(true)
          setTimeout(() => {
            setLoading(false)
            toast.success('Treino publicado')
          }, 900)
        }}
      >
        Publicar treino
      </Button>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Abrir diálogo
      </Button>
      <Button variant="ghost" onClick={() => toast.error('Não foi possível salvar. Verifique a conexão e tente de novo.')}>
        Simular erro
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Desvincular aluno?"
        description="Você deixa de ver treinos e histórico deste aluno. Ele mantém o próprio histórico."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false)
                toast.success('Aluno desvinculado')
              }}
            >
              Desvincular
            </Button>
          </>
        }
      />
    </div>
  )
}

export function InteractiveDemo() {
  return (
    <ToastProvider>
      <Buttons />
    </ToastProvider>
  )
}
