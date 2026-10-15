/**
 * Link para o WhatsApp com mensagem pronta. Sem telefone, abre o WhatsApp para o personal escolher o contato.
 * Nada é enviado automaticamente: o personal revisa e envia.
 */
export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "")
  // Número brasileiro sem código do país (10–11 dígitos) recebe 55.
  const full = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
  const q = `text=${encodeURIComponent(text)}`
  return full ? `https://wa.me/${full}?${q}` : `https://wa.me/?${q}`
}

export function comebackMessage(studentName: string, trainerName: string, days: number | null) {
  const first = studentName.split(" ")[0]
  const lead = days === null ? "Ainda não vi seu primeiro treino registrado no app" : `Faz ${days} dias que não vejo treino seu no app`
  return `Oi, ${first}! Aqui é ${trainerName.split(" ")[0]}. ${lead} — está tudo bem? Se a rotina apertou, me conta que eu ajusto sua ficha para caber na sua semana. 💪`
}
