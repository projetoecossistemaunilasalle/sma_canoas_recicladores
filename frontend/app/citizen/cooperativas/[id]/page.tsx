import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Mail,
  Phone,
  Camera,
  Recycle,
  History,
  Leaf,
} from "lucide-react";

const COOPERATIVES = [
  {
    id: 1,
    name: "CMGC — Cooperativa Mato Grande Canoense",
    image: "/logos/mato_grande.png",
    location: "Bairro Harmonia e Bairro Mato Grande, Canoas/RS",
    founded: "Formalizada em 2021",
    description:
      "Uma trajetória de organização, trabalho coletivo, coleta seletiva e educação ambiental.",
    history: [
      "A Cooperativa Mato Grande Canoense (CMGC) iniciou sua trajetória em 2019, a partir do desmembramento de um grupo já existente. Oficializada em 2021, conquistou sua independência e a Permissão de Uso de uma área pública em 2022.",
      "Desde então, vem fortalecendo sua atuação na coleta seletiva, reciclagem e educação ambiental. Em 2022 passou a fazer parte da Coleta Seletiva de Canoas e do projeto Canoas Recicla com a Gente, em parceria com a Apoena Socioambiental e apoio da Unilasalle.",
      "A CMGC é formada, em média, por 30 cooperados e cooperadas que atuam na coleta, separação e destinação adequada dos resíduos, gerando trabalho, renda e inclusão social.",
      "Atualmente, desenvolve suas atividades em um espaço alugado na Rua Engenheiro Kindler, no bairro Harmonia. A área concedida pelo Município fica na Rua Dona Maria Isabel, no bairro Mato Grande, onde está prevista a construção de um novo galpão pelo projeto Conexões Sustentáveis, com apoio da Petrobrás.",
    ],
    address: "Rua Engenheiro Kindler, nº 1261, bairro Harmonia, Canoas/RS.",
    email: "cooperativamatograndecanoense@gmail.com",
    phone: "(51) 98214-9694",
    instagram: "@cmgc_oficial",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Engenheiro+Kindler+1261+Canoas+RS",
    milestones: ["2019 — Início da trajetória", "2021 — Formalização", "2022 — Permissão de Uso"],
  },
  {
    id: 2,
    name: "Cooarlas — Amigas e Amigos Solidárias",
    image: "/logos/cooarlas.png",
    location: "Bairro Guajuviras, Canoas/RS",
    founded: "Cooperativa desde 2009",
    description:
      "Uma história de mobilização comunitária, solidariedade e fortalecimento da reciclagem.",
    history: [
      "A história começou em 1999, quando um grupo ligado à Pastoral da Criança e da Juventude e ao Movimento de Mulheres de Canoas se preocupou em qualificar jovens para o trabalho. Sem adesão dos jovens, seis mulheres seguiram sozinhas e fundaram, em outubro de 2000, a ARLAS, associação que deu origem à cooperativa.",
      "No início, a triagem era feita em uma garagem de apenas 9 m². Em 2002, a comunidade e seus parceiros conquistaram recursos do Orçamento Participativo Estadual e do Fundo de Amparo ao Trabalhador (FAT) para construir um galpão de 570 m².",
      "A Cooarlas foi formalizada como cooperativa em 2009, com 20 sócias vindas da ARLAS, e em 2010 entrou para a coleta seletiva compartilhada de Canoas.",
      "Durante a enchente de 2024, mesmo sem ter sido diretamente inundada, a cooperativa enfrentou a superlotação de resíduos. Posteriormente, o projeto Conexões Sustentáveis contribuiu com caminhão, prensa, esteira e mesas de triagem.",
    ],
    address: "Rua Bela Vista, nº 14, bairro Guajuviras, Canoas/RS.",
    email: "cooarlas2010@gmail.com",
    phone: "(51) 3428-6896",
    instagram: "@cooarlas",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Bela+Vista+14+Guajuviras+Canoas+RS",
    milestones: ["2000 — Fundação da ARLAS", "2009 — Formalização", "2010 — Coleta seletiva"],
  },
  {
    id: 3,
    name: "Cooperativa Renascer",
    image: "/logos/renascer.png",
    location: "Bairro Guajuviras, Canoas/RS",
    founded: "Trajetória iniciada em 1976",
    description:
      "Uma história de resistência, organização coletiva e valorização dos trabalhadores da reciclagem.",
    history: [
      "Entre 1976 e 2001, catadores trabalhavam de forma individual e informal no antigo lixão da cidade, na Fazenda Guajuviras, expostos ao sol, à poeira e ao lodo e disputando resíduos diretamente dos caminhões. Foram décadas de trabalho sem infraestrutura adequada.",
      "Em 2005, mudanças nas regras para o trabalho em aterros levaram à retirada do grupo do lixão e à cessão de um espaço coberto pela Prefeitura. Em 2009, a Unilasalle iniciou o trabalho de incubação e, em 2010, nasceu oficialmente a Cooperativa de Reciclagem Renascer.",
      "O nome Renascer remete à ave Fênix estampada na fachada do galpão, símbolo de renascimento. Ao longo dos anos, a cooperativa conquistou caminhão, esteira, balança digital e melhorias na estrutura. Em 2017, recebeu o prêmio nacional Pró-Catador.",
      "Com autogestão e liderança majoritariamente feminina, a cooperativa realiza a triagem de dezenas de toneladas de resíduos por mês. Durante a enchente de 2024, também acolheu trabalhadores de outras cooperativas afetadas.",
    ],
    address: "Estrada do Nazário, nº 3303, bairro Guajuviras, Canoas/RS.",
    email: "coop.renascer@gmail.com",
    phone: "(51) 98592-7518",
    instagram: "@cooperativa_renascer",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Estrada+do+Nazario+3303+Canoas+RS",
    milestones: ["1976 — Início no antigo lixão", "2010 — Formalização", "2017 — Prêmio Pró-Catador"],
  },
  {
    id: 4,
    name: "Coopcamate",
    image: "/logos/coopcamate.png",
    location: "Bairro Mathias Velho, Canoas/RS",
    founded: "Atividades iniciadas em 1986",
    description:
      "Uma cooperativa marcada pela organização comunitária e por iniciativas de coleta seletiva sustentável.",
    history: [
      "A Coopcamate foi fundada por cinco moradores do bairro Mathias Velho em 1986. Formalizou-se como associação em 1995 e como cooperativa em 2003.",
      "Em 2010, entrou para a coleta seletiva de Canoas e para a incubadora de empreendimentos solidários da Unilasalle. Em 2011, problemas na coordenação levaram à perda do contrato com a Prefeitura em 2012.",
      "Com uma nova diretoria, recuperou o contrato ainda em 2012 e continuou investindo em sua estrutura: adquiriu caminhão próprio em 2013, ampliou a esteira em 2015 e encerrou uma parceria financeira externa em 2017.",
      "Uma das iniciativas mais conhecidas é o Bikeco, projeto de coleta seletiva com bicicletas ecológicas na região central da cidade. A enchente de 2024 afetou severamente a cooperativa, que recebeu reformas e capacitações pelo projeto Conexões Sustentáveis.",
    ],
    address: "Rua Dom Pedrito, nº 800, bairro Mathias Velho, Canoas/RS.",
    email: "coopcamate@gmail.com",
    phone: "(51) 99151-5113",
    instagram: "@cooperativa_coopcamate",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Dom+Pedrito+800+Canoas+RS",
    milestones: ["1986 — Início das atividades", "2003 — Formalização", "2012 — Recuperação do contrato"],
  },
  {
    id: 5,
    name: "Coopermag",
    image: "/logos/coopermag.png",
    location: "Bairro Mato Grande, Canoas/RS",
    founded: "Formalizada em 2010",
    description:
      "Uma história de transformação de iniciativas comunitárias em trabalho com materiais recicláveis.",
    history: [
      "A Coopermag começou em 2002, dentro de uma igreja, como Atremag, um clube de mães apoiado pelo Frei Miguel. O grupo buscava gerar renda com cursos de tricô e produção de pães.",
      "A Cooarlas ajudou o grupo a conhecer o trabalho com materiais recicláveis. A associação passou a receber caminhões de resíduos domiciliares para triagem e, depois de anos tentando se legalizar, formalizou-se como cooperativa em 2010.",
      "A partir de 2011, passou a atuar na coleta seletiva do bairro Estância Velha. Em 2015, um temporal derrubou o telhado do galpão, e o grupo precisou dividir espaço com a Coopcamate durante nove meses.",
      "Em 2024, a enchente deixou a cooperativa inundada por 45 dias. Os cooperados foram acolhidos pela Renascer enquanto as máquinas e o galpão ficaram sem condições de uso. Depois, o grupo mudou-se para um espaço alugado no bairro Mato Grande, com previsão de receber um novo prédio por meio do projeto Conexões Sustentáveis.",
    ],
    address: "Rua Maria Elizabeth Finkler, nº 270, bairro Mato Grande, Canoas/RS.",
    email: "cooperativacoopermag@gmail.com",
    phone: "(51) 99370-3877",
    instagram: "@cooperativacoopermag",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Maria+Elizabeth+Finkler+270+Canoas+RS",
    milestones: ["2002 — Origem como clube de mães", "2010 — Formalização", "2024 — Enchente e reconstrução"],
  },
  {
    id: 6,
    name: "Cooperativa Mãos Dadas",
    image: "/logos/maos_dadas.png",
    location: "Bairro Fátima, Canoas/RS",
    founded: "Origem em 2014",
    description:
      "Uma trajetória de união, regularização e reconstrução após os impactos da enchente.",
    history: [
      "A Mãos Dadas surgiu em 2014, a partir das obras da Rodovia do Parque (BR-448). Moradores realocados do dique para casas de passagem no Loteamento Prata se uniram a catadores para fundar uma associação.",
      "Com apoio da Prefeitura e do DNIT, que disponibilizou um pavilhão, a cooperativa foi estruturada. Inicialmente, não possuía contrato com o município e trabalhava principalmente com materiais recicláveis doados por outras cooperativas, que eram separados e comercializados.",
      "Em 2020, uma nova coordenação iniciou a organização do espaço e a regularização da documentação. Em 2022, a Mãos Dadas, juntamente com a CMGC, a Coopersol e a Coopertec, assinou contrato com a Prefeitura para realizar a coleta seletiva compartilhada em Canoas.",
      "Em 2024, a cooperativa ficou submersa por 28 dias devido à enchente. Desde então, segue em processo de reconstrução, com trabalhos conjuntos e parcerias.",
    ],
    address: "Rua Ney Lobos, nº 85, bairro Fátima, Canoas/RS.",
    email: "comaosdadas@gmail.com",
    phone: "(51) 99523-6830",
    instagram: "@maosdadas.coop",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Ney+Lobos+85+Canoas+RS",
    milestones: ["2014 — Fundação", "2020 — Regularização", "2022 — Coleta seletiva compartilhada"],
  },
  {
    id: 7,
    name: "Coopersol",
    image: "/logos/coopersol.png",
    location: "Bairro Niterói, Canoas/RS",
    founded: "Formalizada como cooperativa em 2022",
    description:
      "Uma trajetória de adaptação, organização coletiva e fortalecimento da reciclagem.",
    history: [
      "Em 2003, o grupo iniciou suas atividades de separação e reciclagem de resíduos da construção civil sob o nome Associação Sol Nascente, no Parque Industrial Jorge Lanner.",
      "Entre 2009 e 2017, chegou a reunir mais de 40 cooperados. Em 2018, precisou deixar o local quando uma licitação transferiu a operação de forma exclusiva a uma empresa privada.",
      "Após passar por galpões alugados e receber capacitações da Prefeitura, o grupo formalizou-se como cooperativa em 2022, com cerca de 20 pessoas, e ingressou na coleta seletiva de resíduos sólidos do município utilizando equipamentos alugados.",
      "Depois da enchente de 2024, os processos de gestão foram reforçados. O projeto Conexões Sustentáveis prevê novos equipamentos para a operação, além de iniciativas para viabilizar um novo galpão.",
    ],
    address: "Rua Ivanir José Pagliarini, nº 506, bairro Niterói, Canoas/RS.",
    email: "coopersolcanoas@gmail.com",
    phone: "(51) 99611-0057",
    instagram: "@ccoopersol",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Ivanir+Jose+Pagliarini+506+Canoas+RS",
    milestones: ["2003 — Associação Sol Nascente", "2018 — Mudança de local", "2022 — Formalização"],
  },
  {
    id: 8,
    name: "Coopertec — Reciclagem de Eletrônicos",
    image: "/logos/coopertec.png",
    location: "Bairro Rio Branco, Canoas/RS",
    founded: "Fundada em 2013",
    description:
      "Especializada no recolhimento e na destinação adequada de equipamentos eletroeletrônicos.",
    history: [
      "A Coopertec nasceu em 2013, diante da falta de alternativas adequadas para o descarte de equipamentos eletroeletrônicos em Canoas. Em 2014, a retirada de duas toneladas de lixo eletrônico de um terreno baldio evidenciou a importância desse trabalho.",
      "Além da coleta, a cooperativa investiu em campanhas, palestras e em um pequeno museu de eletrônicos, apresentando a evolução tecnológica e reforçando a importância do descarte correto.",
      "A partir de 2020, ampliou sua estrutura de 200 m² para 2.400 m² e substituiu um simples reboque por veículos de maior porte.",
      "A cooperativa reúne, em média, 11 cooperados e oferece coleta gratuita de eletroeletrônicos para pessoas físicas e jurídicas, mediante agendamento por telefone ou redes sociais.",
    ],
    address: "Rua Primavera, nº 198, bairro Rio Branco, Canoas/RS.",
    email: "coopertecreciclagem@gmail.com",
    phone: "(51) 98416-9301",
    instagram: "@coopertecrs",
    maps:
      "https://www.google.com/maps/search/?api=1&query=Rua+Primavera+198+Canoas+RS",
    milestones: ["2013 — Fundação", "2014 — Coleta de eletrônicos", "2020 — Ampliação da estrutura"],
  },
];

type CooperativePageProps = {
  params: Promise<{ id: string }>;
};

export default async function CooperativePage({
  params,
}: CooperativePageProps) {
  const { id } = await params;

  const cooperative = COOPERATIVES.find(
    (item) => item.id === Number(id),
  );

  if (!cooperative) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f5f3e9] px-4 py-8 pb-16 text-[#203d2c] sm:px-6 sm:py-10 sm:pb-20 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <Link
          href="/citizen/educacao"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d9e2d4] bg-white/80 px-5 py-3 text-sm font-semibold text-[#254b35] transition hover:bg-white"
        >
          <ArrowLeft size={18} />
          Voltar para Educação Ambiental
        </Link>

        <section className="overflow-hidden rounded-[30px] border border-[#e1e5d8] bg-white shadow-sm">
          <div className="grid items-center gap-8 p-6 sm:p-9 md:grid-cols-[0.9fr_1.1fr] md:p-12">
            <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-[24px] bg-[#f7f8f1] p-6 sm:min-h-[320px]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#e9f0e4] via-transparent to-[#f5f3e9]" />
              <div className="relative h-[230px] w-full sm:h-[280px]">
                <Image
                  src={cooperative.image}
                  alt={`Logo da ${cooperative.name}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-contain p-3"
                />
              </div>
            </div>

            <div className="py-2">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#eaf1e5] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#356044]">
                <Recycle size={16} />
                Cooperativa de reciclagem
              </div>

              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#203d2c] sm:text-4xl lg:text-5xl">
                {cooperative.name}
              </h1>

              <p className="mt-4 text-sm font-semibold text-[#63805f]">
                {cooperative.founded}
              </p>

              <p className="mt-4 max-w-xl text-base leading-8 text-[#5c6c5e]">
                {cooperative.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#historia"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#244b34] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#173b27]"
                >
                  Conheça a história
                  <ArrowUpRight size={17} />
                </a>

                <a
                  href="#contato"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d5dfd1] px-6 py-3 text-sm font-semibold text-[#244b34] transition hover:bg-[#f0f4eb]"
                >
                  Entrar em contato
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="historia"
          className="scroll-mt-24 rounded-[30px] border border-[#e1e5d8] bg-white p-6 shadow-sm sm:p-9 md:p-11"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf1e5] text-[#356044]">
              <History size={23} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#78916e]">
                Conheça a cooperativa
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#203d2c] sm:text-3xl">
                Nossa história
              </h2>

              <div className="mt-6 space-y-5">
                {cooperative.history.map((paragraph, index) => (
                  <p
                    key={index}
                    className="max-w-4xl text-base leading-8 text-[#5c6c5e]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {cooperative.milestones.map((milestone) => (
                  <span
                    key={milestone}
                    className="rounded-full border border-[#dce5d7] bg-[#f2f5ed] px-4 py-2 text-sm font-medium text-[#416347]"
                  >
                    {milestone}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#f2f5ed] p-5">
            <Leaf
              size={21}
              className="mt-1 shrink-0 text-[#4d7853]"
            />
            <p className="text-sm leading-7 text-[#4c6550]">
              A reciclagem contribui para o reaproveitamento dos materiais,
              a redução dos resíduos descartados e o fortalecimento da
              sustentabilidade em Canoas.
            </p>
          </div>
        </section>

        <section
          id="contato"
          className="scroll-mt-24 rounded-[30px] bg-[#1d402d] p-6 text-white shadow-lg sm:p-9 md:p-11"
        >
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.5fr] md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                Entre em contato
              </span>

              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Fale com a cooperativa
              </h2>

              <p className="mt-4 max-w-sm leading-7 text-white/80">
                Consulte as informações de localização e utilize os canais
                disponíveis para entrar em contato.
              </p>

              <div className="mt-7 rounded-2xl border border-white/15 bg-white/[0.06] p-4">
                <p className="font-semibold text-amber-300">
                  {cooperative.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/85">
                  Fortalecendo a coleta seletiva e a sustentabilidade em
                  Canoas.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.12]">
                <MapPin
                  size={25}
                  strokeWidth={1.8}
                  className="mb-5 text-amber-300"
                />
                <h3 className="font-bold">Endereço</h3>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  {cooperative.address}
                </p>
                <a
                  href={cooperative.maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-300 underline-offset-4 hover:underline"
                >
                  Ver no mapa
                  <ArrowUpRight size={15} />
                </a>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.12]">
                <Mail
                  size={25}
                  strokeWidth={1.8}
                  className="mb-5 text-amber-300"
                />
                <h3 className="font-bold">E-mail</h3>
                <a
                  href={`mailto:${cooperative.email}`}
                  className="mt-2 inline-block break-all text-sm text-white/80 underline underline-offset-4 hover:text-amber-300"
                >
                  {cooperative.email}
                </a>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.12]">
                <Phone
                  size={25}
                  strokeWidth={1.8}
                  className="mb-5 text-amber-300"
                />
                <h3 className="font-bold">Telefone</h3>
                <a
                  href={`tel:${cooperative.phone.replace(/\D/g, "")}`}
                  className="mt-2 inline-block text-sm text-white/80 underline underline-offset-4 hover:text-amber-300"
                >
                  {cooperative.phone}
                </a>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:bg-white/[0.12]">
                <Camera
                  size={25}
                  strokeWidth={1.8}
                  className="mb-5 text-amber-300"
                />
                <h3 className="font-bold">Instagram</h3>
                <a
                  href={`https://www.instagram.com/${cooperative.instagram.replace("@", "")}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block break-all text-sm text-white/80 underline underline-offset-4 hover:text-amber-300"
                >
                  {cooperative.instagram}
                </a>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-2 w-full px-4 pb-8 pt-4 text-center">
          <p className="text-sm leading-7 text-[#748071]">
            Educação Ambiental · Canoas/RS
          </p>

          <Link
            href="/citizen/educacao"
            className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 pb-2 text-sm font-semibold text-[#356044] hover:underline"
          >
            <ArrowLeft size={16} />
            Conhecer outras cooperativas
          </Link>
        </footer>
      </div>
    </main>
  );
}
