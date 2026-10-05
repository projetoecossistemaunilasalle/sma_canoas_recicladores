import { EducationList } from "./education-list";
import { getDailyTip } from "./categories";

const COOPERATIVES = [
  {
    id: 1,
    name: "CMGC - Mato Grande Canoense",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 2,
    name: "Cooarlas",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 3,
    name: "Renascer",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 4,
    name: "Coopcamate",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 5,
    name: "Coopermag",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 6,
    name: "Cooperativas Mãos Dadas",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 7,
    name: "Coopersol",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 8,
    name: "Coopertec",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
];

const MATERIAL_INFO = [
  {
    title: "Papel",
    text: "Conheça os tipos de papel que podem ser reciclados e saiba como prepará-los para a coleta.",
  },
  {
    title: "Plástico",
    text: "Aprenda a identificar os diferentes tipos de plástico e quais materiais devem ser separados.",
  },
  {
    title: "Vidro",
    text: "Entenda quais vidros podem ser reciclados e como descartar materiais quebrados com segurança.",
  },
  {
    title: "Metal",
    text: "Saiba quais metais podem ser reciclados e como preparar latas e outros objetos.",
  },
];

const ACTIONS = [
  {
    title: "Tecnosocial Unilasalle",
    description:
      "Projeto e iniciativa relacionados à educação ambiental e à atuação comunitária em Canoas.",
  },
  {
    title: "Canoas Recicla com a Gente",
    description:
      "Projeto de educação ambiental e valorização da reciclagem desenvolvido em parceria com a comunidade.",
  },
  {
    title: "Histórico do Canoas Recicla",
    description:
      "Conheça a trajetória do projeto, suas ações e os principais momentos de sua história.",
  },
  {
    title: "Calculadora da Reciclagem",
    description:
      "Ferramenta para conhecer melhor o impacto da reciclagem e acompanhar informações relacionadas.",
  },
];

export default function EducacaoPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-8 pb-28 flex flex-col gap-8">

      {/* CABEÇALHO */}

      <section>
        <h1 className="text-display-lg font-bold text-on-surface">
          Educação Ambiental
        </h1>

        <p className="text-body-md text-on-surface-variant mt-2">
          Aprenda a descartar cada resíduo corretamente e ajude Canoas a
          reciclar mais.
        </p>
      </section>

      {/* BUSCA + 8 MATERIAIS */}

      <EducationList />

      

      {/* COOPERATIVAS */}

      <section className="rounded-3xl bg-[#fff8df] border border-[#f1df9b] p-5 md:p-7">

        <div className="mb-6">

          <p className="text-sm font-semibold text-[#55733c] uppercase tracking-wide">
            Reciclagem em Canoas
          </p>

          <h2 className="text-2xl font-bold text-on-surface mt-1">
            Cooperativas de reciclagem de Canoas
          </h2>

          <p className="text-body-md text-on-surface-variant mt-2">
            Conheça as cooperativas, suas histórias e o trabalho desenvolvido
            na cidade.
          </p>

        </div>

        {/* 4 POR LINHA = 2 FILEIRAS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {COOPERATIVES.map((cooperative) => (
            <article
              key={cooperative.id}
              className="bg-white rounded-2xl border border-[#eee5c7] p-5 shadow-sm flex flex-col"
            >

              <div className="w-full aspect-[4/3] rounded-xl bg-[#eef2ea] flex items-center justify-center mb-4">

                <span className="material-symbols-outlined text-[42px] text-[#55733c]">
                  recycling
                </span>

              </div>

              <h3 className="text-lg font-bold text-on-surface">
                {cooperative.name}
              </h3>

              <p className="text-sm text-on-surface-variant mt-2 leading-6 flex-1">
                {cooperative.description}
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-[#55733c] inline-flex items-center gap-1"
              >
                Ver história

                <span className="text-lg">
                  →
                </span>
              </button>

            </article>
          ))}

        </div>

      </section>

      {/* AÇÕES */}

      <section className="rounded-3xl bg-[#f9e8ef] border border-[#e9cbd7] p-5 md:p-7">

        <div className="mb-6">

          <p className="text-sm font-semibold text-[#8a5368] uppercase tracking-wide">
            Projetos e ações
          </p>

          <h2 className="text-2xl font-bold text-on-surface mt-1">
            Ações de educação ambiental
          </h2>

          <p className="text-body-md text-on-surface-variant mt-2">
            Conheça projetos, iniciativas e ações relacionadas à educação
            ambiental e à reciclagem em Canoas.
          </p>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {ACTIONS.map((action) => (
            <article
              key={action.title}
              className="bg-white rounded-2xl border border-[#eadbe1] p-5 shadow-sm"
            >

              <div className="w-10 h-10 rounded-full bg-[#f3d9e3] flex items-center justify-center mb-4">

                <span className="material-symbols-outlined text-[#8a5368]">
                  campaign
                </span>

              </div>

              <h3 className="text-lg font-bold text-on-surface">
                {action.title}
              </h3>

              <p className="text-sm text-on-surface-variant mt-3 leading-6">
                {action.description}
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-[#8a5368] inline-flex items-center gap-1"
              >
                Saiba mais

                <span className="text-lg">
                  →
                </span>
              </button>

            </article>
          ))}

        </div>

      </section>

      {/* FRASE FINAL */}

      <section className="text-center px-4 py-4">

        <h2 className="text-xl font-bold text-on-surface">
          Pequenas atitudes fazem diferença.
        </h2>

        <p className="text-sm text-on-surface-variant mt-2">
          Separar corretamente os resíduos contribui para uma cidade mais
          limpa e fortalece o trabalho das cooperativas.
        </p>

      </section>

      {/* DICA DO DIA — FICA NO FINAL */}

      <section className="bg-tertiary-container/40 rounded-2xl p-5 border border-outline-variant/30">

        <p className="text-label-lg text-on-surface-variant mb-1">
          Dica do dia
        </p>

        <p className="text-body-md text-on-surface">
          {getDailyTip()}
        </p>

      </section>

    </main>
  );
}