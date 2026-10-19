
"use client";

import { useEffect, useState } from "react";
import { EducationList } from "./education-list";
import Image from "next/image";
import Link from "next/link";

const COOPERATIVES = [
  {
    id: 1,
    name: "CMGC - Mato Grande Canoense",
    image: "/logos/mato_grande.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 2,
    name: "Cooarlas",
    image: "/logos/cooarlas.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 3,
    name: "Renascer",
    image: "/logos/renascer.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 4,
    name: "Coopcamate",
    image: "/logos/coopcamate.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 5,
    name: "Coopermag",
    image: "/logos/coopermag.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 6,
    name: "Cooperativas Mãos Dadas",
    image: "/logos/maos_dadas.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 7,
    name: "Coopersol",
    image: "/logos/coopersol.png",
    description:
      "Conheça a história, o trabalho e os materiais recebidos.",
  },
  {
    id: 8,
    name: "Coopertec",
    image: "/logos/coopertec.png",
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
      "Conheça o projeto Tecnosocial da Universidade La Salle e suas iniciativas de atuação comunitária em Canoas.",
    image: "/acoes/tecnosocial.png",
    link: "https://www.unilasalle.edu.br/canoas/servicos/tecnosocial",
    buttonText: "Acessar site",
  },
  {
    title: "Canoas Recicla com a Gente",
    description:
      "Acompanhe as ações de educação ambiental, reciclagem e valorização das cooperativas de Canoas.",
    image: "/acoes/canoas_recicla.jpg",
    link: "https://www.instagram.com/canoasreciclacomagente/",
    buttonText: "Ver Instagram",
  },
  {
    title: "Vídeo educativo",
    description:
      "Assista à apresentação Casa Comum: pílulas pró-ambientais, com Maria de Lourdes Borges.",
    image: "/acoes/pilulas_pro_ambiental.png",
    link: "https://www.youtube.com/watch?v=MGRGGfBWIJM",
    buttonText: "Assistir vídeo",
  },
  {
    title: "Hub Pró Reciclagem",
    description:
      "Conheça futuramente o hub de informações, histórico e iniciativas relacionadas à reciclagem e à educação ambiental em Canoas.",
    image: "/acoes/hub_pro_reciclagem.jpg",
    link: null,
    buttonText: "Em breve",
  },
];

const TIPS = [
  "Evite plásticos de uso único, como sacolas, canudos e copos descartáveis.",
  "Use embalagens recicláveis ou reutilize embalagens sempre que possível.",
  "Separe o plástico limpo e seco antes de descartar.",
  "Materiais recicláveis sujos podem contaminar outros materiais e prejudicar a reciclagem.",
  "Observe os símbolos nas embalagens para identificar os tipos de plástico.",
  "Leve lâmpadas usadas aos pontos de coleta apropriados.",
  "Prefira copos reutilizáveis em festas e eventos.",
  "Separe papel, plástico, vidro e metal para facilitar a coleta seletiva.",
];

export default function EducacaoPage() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((current) => (current + 1) % TIPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

      {/* BUSCA + MATERIAIS */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COOPERATIVES.map((cooperative) => (
            <article
              key={cooperative.id}
              className="bg-white rounded-2xl border border-[#eee5c7] p-5 shadow-sm flex flex-col"
            >
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#eef2ea] mb-4">
                <Image
                  src={cooperative.image}
                  alt={`Cooperativa ${cooperative.name}`}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
              </div>

              <h3 className="text-lg font-bold text-on-surface">
                {cooperative.name}
              </h3>

              <p className="text-sm text-on-surface-variant mt-2 leading-6 flex-1">
                {cooperative.description}
              </p>

              <Link
                href={`/citizen/cooperativas/${cooperative.id}`}
                className="mt-4 text-sm font-semibold text-[#55733c] inline-flex items-center gap-1"
              >
                Ver história
                <span className="text-lg">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* AÇÕES DE EDUCAÇÃO AMBIENTAL */}
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
              className="bg-white rounded-2xl border border-[#eadbe1] p-5 shadow-sm flex flex-col"
            >
              {/* IMAGEM DO PROJETO */}
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#f8edf1] mb-4">
                <Image
                  src={action.image}
                  alt={`Imagem de ${action.title}`}
                  fill
                  className="object-contain p-3"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
              </div>

              <h3 className="text-lg font-bold text-on-surface">
                {action.title}
              </h3>

              <p className="text-sm text-on-surface-variant mt-3 leading-6 flex-1">
                {action.description}
              </p>

              {action.link ? (
                <a
                  href={action.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 text-sm font-semibold text-[#8a5368] inline-flex items-center gap-1 hover:underline"
                >
                  {action.buttonText}
                  <span className="text-lg">→</span>
                </a>
              ) : (
                <span className="mt-4 text-sm font-semibold text-gray-500 inline-flex items-center gap-1">
                  {action.buttonText}
                </span>
              )}
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

      {/* DICAS ROTATIVAS */}
      <section className="bg-tertiary-container/40 rounded-2xl p-5 border border-outline-variant/30">
        <p className="text-label-lg text-on-surface-variant mb-3">
          Dicas
        </p>

        <p
          key={tipIndex}
          className="text-body-md text-on-surface"
          aria-live="polite"
        >
          {TIPS[tipIndex]}
        </p>
      </section>

    </main>
  );
}
