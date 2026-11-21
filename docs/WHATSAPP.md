# Robô de WhatsApp (Evolution API)

O EVOFIT envia mensagens automáticas pelo WhatsApp usando a **Evolution API**, um programa gratuito e
de código aberto que conecta um WhatsApp comum por QR Code (como o WhatsApp Web).

> **Atenção:** esse tipo de conexão não é oficial. O WhatsApp pode bloquear o número. Use um **chip
> só para o EVOFIT**, nunca o seu número pessoal, e evite mandar muitas mensagens para quem não te conhece.

## O que o robô envia

| Para quem | Quando | Mensagem |
|---|---|---|
| Equipe (você) | Novo personal se cadastra | "Novo personal cadastrado" |
| Equipe | Personal pede o Vitalício | "Novo pedido de Vitalício" |
| Equipe | Assinatura paga no Stripe | "Nova assinatura" |
| Equipe | Pagamento falha | "Pagamento pendente" |
| Personal | Termina as boas-vindas (se informou WhatsApp) | Boas-vindas |
| Personal | Faltam 2 dias ou menos do teste | "Seu teste acaba em X dias" (1 vez) |
| Personal | Teste acabou | "Seu teste terminou" (1 vez) |
| Personal | Admin confirma o Pix do Vitalício | "Vitalício liberado" |

Tudo fica registrado no admin, no bloco **Robô de WhatsApp**, que também tem o botão "Enviar mensagem de teste".
Sem configuração, nada é enviado e o sistema funciona normalmente.

## Como colocar no ar (grátis)

1. **Chip novo** com WhatsApp instalado (pode ser WhatsApp Business).
2. **Servidor para a Evolution API.** Ela precisa ficar ligada 24 h, então não roda na Vercel. Opções com plano gratuito ou barato:
   Railway, Render ou um VPS. No Railway existe o modelo pronto "Evolution API".
   Anote a **URL** do servidor e a **chave** (`AUTHENTICATION_API_KEY`) que você definir.
3. **Criar a instância e conectar o número.** No painel da Evolution API (ou pela API), crie uma
   instância, por exemplo `evofit`, abra o QR Code e escaneie com o WhatsApp do chip.
4. **Variáveis na Vercel** (Settings → Environment Variables → Production):
   - `EVOLUTION_API_URL`: a URL do servidor (ex.: `https://evolution-xxxx.up.railway.app`)
   - `EVOLUTION_API_KEY`: a chave
   - `EVOLUTION_INSTANCE`: o nome da instância (ex.: `evofit`)
   - `ADMIN_WHATSAPP` (opcional): quem recebe os avisos da equipe. Vazio = `SALES_WHATSAPP`.
5. **Redeploy** na Vercel e clique em "Enviar mensagem de teste" no admin.

Os lembretes do teste rodam 1 vez por dia (10h, horário de Brasília) pelo Vercel Cron (`vercel.json`),
protegidos por `CRON_SECRET`.
