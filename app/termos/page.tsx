import type { Metadata } from "next"
import Link from "next/link"
import { LegalDoc } from "@/components/legal-doc"
import { LEGAL } from "@/lib/legal"
import { PLANS, TRIAL_DAYS, brl } from "@/lib/plans"

export const metadata: Metadata = { title: "Termos de Uso" }

export default function Termos() {
  return (
    <LegalDoc title="Termos de Uso">
      <p>
        Estes Termos regem o uso do EVOFIT, plataforma oferecida por {LEGAL.owner} ({LEGAL.document}), com sede em {LEGAL.city} (“EVOFIT”, “nós”). Ao criar uma conta, você
        (“Personal”) concorda com estes Termos e com a <Link href="/privacidade" className="font-semibold text-accent underline">Política de Privacidade</Link>.
      </p>

      <h2>1. O que é o EVOFIT</h2>
      <p>
        Um software online (SaaS) para personal trainers organizarem alunos, fichas de treino, avaliações físicas, frequência e mensalidades, com um aplicativo web gratuito
        para os alunos acompanharem e registrarem os treinos.
      </p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e informar dados verdadeiros.</li>
        <li>A senha é pessoal. Você responde pelo que for feito na sua conta e pelos acessos que gerar para seus alunos.</li>
        <li>Podemos suspender contas que violem estes Termos, a lei ou que coloquem a plataforma ou terceiros em risco, avisando sempre que possível.</li>
      </ul>

      <h2>3. Responsabilidade profissional</h2>
      <p>
        O EVOFIT é uma ferramenta de apoio. A prescrição de exercícios, as avaliações e qualquer orientação aos alunos são de responsabilidade exclusiva do Personal, que
        deve estar habilitado para exercer a profissão. As demonstrações da biblioteca de exercícios são referências gerais e não substituem a orientação profissional.
        Os cálculos de composição corporal são estimativas baseadas em fórmulas reconhecidas e nos dados informados.
      </p>

      <h2>4. Dados dos alunos</h2>
      <p>
        Em relação aos dados dos seus alunos, você é o <b>controlador</b> e o EVOFIT é o <b>operador</b>, nos termos da LGPD (Lei 13.709/2018). Você declara que só
        cadastrará alunos com o consentimento deles (ou outra base legal válida), principalmente para dados de saúde, como medidas e percentual de gordura, e que
        atenderá aos pedidos dos seus alunos sobre os dados deles. O EVOFIT trata esses dados apenas para prestar o serviço, conforme a Política de Privacidade.
      </p>

      <h2>5. Planos, teste grátis e pagamento</h2>
      <ul>
        <li>Toda conta nova tem {TRIAL_DAYS} dias de teste grátis, sem cartão. Ao fim do teste, o Studio fica bloqueado até a escolha de um plano; os dados ficam guardados.</li>
        <li>
          Planos vigentes: Inicial ({brl(PLANS.inicial.amount)}/mês), Anual ({brl(PLANS.anual.amount)}/ano) e ofertas especiais divulgadas na plataforma. O aluno não paga.
        </li>
        <li>Assinaturas mensais e anuais são cobradas no cartão pelo Stripe e renovam automaticamente até o cancelamento.</li>
        <li>Você pode cancelar a qualquer momento em Studio → Plano → Gerenciar assinatura. O acesso continua até o fim do período já pago, sem novas cobranças.</li>
        <li>
          Direito de arrependimento: na primeira contratação, você pode desistir em até 7 dias e receber o valor pago de volta (art. 49 do Código de Defesa do Consumidor),
          pelo e-mail {LEGAL.email}.
        </li>
        <li>
          Planos de pagamento único (como o Vitalício de lançamento) dão acesso enquanto o EVOFIT estiver em operação, sem mensalidade. Se o serviço for encerrado,
          avisaremos com pelo menos 90 dias de antecedência e você poderá exportar seus dados.
        </li>
        <li>Os preços podem mudar para novas contratações. Mudanças para quem já assina são avisadas com pelo menos 30 dias de antecedência.</li>
      </ul>

      <h2>6. Uso permitido</h2>
      <p>
        Não é permitido usar o EVOFIT para atividades ilegais, enviar conteúdo ofensivo ou de terceiros sem autorização, tentar acessar dados de outras contas, sobrecarregar
        ou copiar a plataforma. Vídeos e textos que você cadastrar continuam seus; você nos autoriza a exibi-los aos seus alunos dentro do serviço.
      </p>

      <h2>7. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o EVOFIT disponível e seguro, com cópias de segurança do banco de dados, mas podem ocorrer interrupções para manutenção ou por falhas de
        terceiros. Na máxima extensão permitida pela lei, a responsabilidade do EVOFIT fica limitada ao valor pago pelo Personal nos 12 meses anteriores ao fato.
      </p>

      <h2>8. Encerramento da conta</h2>
      <p>
        Você pode excluir sua conta quando quiser, em Studio → Perfil → Sua conta. A exclusão cancela a assinatura e apaga os seus dados e os dos seus alunos de forma
        definitiva, salvo o que a lei obrigar a guardar.
      </p>

      <h2>9. Alterações e foro</h2>
      <p>
        Podemos atualizar estes Termos; mudanças relevantes serão avisadas na plataforma. Estes Termos seguem a lei brasileira. Fica eleito o foro do domicílio do
        consumidor. Dúvidas: {LEGAL.email}.
      </p>
    </LegalDoc>
  )
}
