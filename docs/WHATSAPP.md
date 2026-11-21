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

## Vendedor automático (responde quem pergunta sobre o EVOFIT)

Quando alguém manda mensagem no número do robô, ele responde na hora com o objetivo de fechar a venda:
se apresenta, mostra o que o sistema faz, os planos e manda o link de cadastro (`SITE_URL/criar-conta`).

- **Menu:** 1 O que o EVOFIT faz · 2 Planos e valores · 3 Quero testar grátis · 4 Vitalício · 5 Falar com a equipe.
  Também entende palavras soltas ("quanto custa", "quero testar", "pix", "uso o MFIT", "atendente").
- **Lead quente:** quem pede o Vitalício ou atendimento gera um aviso no seu WhatsApp (`ADMIN_WHATSAPP`).
- **Você assume quando quiser:** respondeu pelo celular, o robô para naquela conversa por 12 h.
  Se a pessoa pede atendimento, ele para por 24 h. No admin (bloco "Vendedor automático") dá para ver
  todas as conversas e clicar em "Eu assumo" ou "Robô assume".
- **Configuração:** na instância da Evolution API, ative o webhook com o evento `MESSAGES_UPSERT` apontando para
  `https://SEU-DOMINIO/api/whatsapp/webhook?token=EVOLUTION_WEBHOOK_TOKEN` (o mesmo valor da variável na Vercel).

As respostas ficam em `lib/server/sales-bot.ts` (função `replyFor`): dá para mudar o texto à vontade.
