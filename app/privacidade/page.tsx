import type { Metadata } from "next"
import Link from "next/link"
import { LegalDoc } from "@/components/legal-doc"
import { LEGAL } from "@/lib/legal"

export const metadata: Metadata = { title: "Política de Privacidade" }

export default function Privacidade() {
  return (
    <LegalDoc title="Política de Privacidade">
      <p>
        Esta Política explica como o EVOFIT, de {LEGAL.owner} ({LEGAL.document}), trata dados pessoais, conforme a Lei Geral de Proteção de Dados (LGPD, Lei
        13.709/2018). Leia também os <Link href="/termos" className="font-semibold text-accent underline">Termos de Uso</Link>.
      </p>

      <h2>1. Quem é quem</h2>
      <ul>
        <li><b>Dados do personal</b> (conta, perfil, pagamento): o EVOFIT é o controlador.</li>
        <li><b>Dados dos alunos</b> cadastrados pelo personal: o personal é o controlador e o EVOFIT é o operador, tratando os dados só para prestar o serviço.</li>
      </ul>

      <h2>2. Quais dados tratamos</h2>
      <ul>
        <li><b>Personal:</b> nome, e-mail, senha (guardada com criptografia, nunca em texto), perfil profissional (cidade, especialidades, WhatsApp e Instagram, se informados), plano e histórico de acesso (data e tipo de aparelho, sem endereço IP).</li>
        <li><b>Pagamento:</b> processado pelo Stripe. O EVOFIT não recebe nem guarda o número do cartão.</li>
        <li><b>Alunos:</b> nome, objetivo, contato (se informado), fichas, treinos realizados, observações, mensalidade e avaliações físicas (peso, altura, dobras, circunferências e percentual de gordura), que são <b>dados de saúde</b>.</li>
        <li><b>Visitantes:</b> mensagens enviadas pelo formulário de contato do perfil público.</li>
      </ul>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Prestar o serviço contratado e manter a conta segura (execução de contrato e legítimo interesse).</li>
        <li>Cobrar as assinaturas e cumprir obrigações fiscais (contrato e obrigação legal).</li>
        <li>Enviar avisos sobre a conta, o teste grátis e o plano.</li>
        <li>Medir o uso de forma agregada para melhorar o produto. Nunca vendemos dados.</li>
      </ul>
      <p>Dados de saúde dos alunos são tratados só para o personal acompanhar a evolução do aluno, com base no consentimento que o personal obtém do aluno.</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Apenas com fornecedores necessários para o serviço funcionar, que seguem regras de segurança e confidencialidade:</p>
      <ul>
        <li>Vercel (hospedagem do aplicativo) e Neon (banco de dados), com servidores que podem estar fora do Brasil, com as garantias previstas na LGPD;</li>
        <li>Stripe (pagamentos);</li>
        <li>serviços de e-mail e de mensagens usados para avisos da conta, quando ativados.</li>
      </ul>
      <p>O perfil público do personal só aparece em “Encontrar personal” se ele escolher aparecer. Dados de alunos nunca são públicos.</p>

      <h2>5. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas com hash, isolamento dos dados de cada personal no banco (cada conta só enxerga os próprios dados) e o aluno vê
        apenas o que é dele. A equipe do EVOFIT vê números agregados e dados da conta do personal, nunca treinos ou medidas dos alunos.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Enquanto a conta existir. Ao excluir a conta, apagamos os dados do personal e dos alunos dele, exceto registros que a lei obrigue a manter (por exemplo, fiscais),
        pelo prazo legal.
      </p>

      <h2>7. Seus direitos</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados e revogar consentimentos, pelo e-mail {LEGAL.email}. A
        exclusão também pode ser feita direto no app. Alunos devem falar primeiro com o seu personal, que é o responsável pelos dados deles; se precisar, o EVOFIT ajuda.
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>8. Cookies</h2>
      <p>Usamos apenas cookies necessários para manter você conectado e lembrar preferências (como o tema). Não usamos cookies de publicidade.</p>

      <h2>9. Contato e alterações</h2>
      <p>Encarregado de dados (DPO): {LEGAL.owner}, {LEGAL.email}. Esta Política pode ser atualizada; mudanças relevantes serão avisadas na plataforma.</p>
    </LegalDoc>
  )
}
