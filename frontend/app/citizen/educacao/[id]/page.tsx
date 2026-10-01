import Link from "next/link";
import { notFound } from "next/navigation";
import { RECYCLING_CATEGORIES } from "../categories";

const CONTENTS: Record<
  string,
  {
    sections: {
      title: string;
      paragraphs?: string[];
      items?: string[];
      image?: string;
    }[];
  }
> = {
  // =========================================================
  // PAPEL
  // =========================================================
  papel: {
    sections: [
      {
        title: "Papéis que podem ser reciclados",
        items: [
          "Papelão: Caixas e embalagens em geral.",
          "Papel de escritório: Folhas de sulfite, rascunhos e impressos.",
          "Papel de leitura: Jornais, revistas, livros e cadernos.",
          "Outros: Cartolinas, agendas e embalagens longa-vida (tetra pak).",
        ],
        image: "/educacao/papel/papel1.jpg",
      },
      {
        title: "Papéis que NÃO podem ser reciclados",
        items: [
          "Sujos ou engordurados: Papel higiênico, guardanapos, papel toalha usados ou papelão com restos de gordura.",
          "Tratados quimicamente: Papel carbono, celofane, papel vegetal e fotografias.",
          "Revestidos: Papéis encerados, plastificados, metalizados ou fitas adesivas.",
        ],
        image: "/educacao/papel/papel2.png",
      },
    ],
  },

  // =========================================================
  // PLÁSTICO
  // =========================================================
  plastico: {
    sections: [
      {
        title: "Tipos de plástico",
        paragraphs: [
          "Existem diferentes tipos de plástico, identificados pelos números de 1 a 7 dentro do símbolo de reciclagem. Entre eles, PET (1), PEAD (2) e PP (5) costumam ter maior facilidade de reciclagem.",
        ],
        image: "/educacao/plastico/plastico1.png",
      },
      {
        title: "PET, PEAD e PP",
        paragraphs: [
          "PET (1), PEAD (2) e PP (5) são alguns dos tipos de plástico apresentados no material.",
        ],
        image: "/educacao/plastico/plastico2.jpg",
      },
      //{
      //  title: "PVC",
       // paragraphs: [
     //     "Materiais de PVC, como canos e forros também podem ser reciclados. Confirmar com as cooperativas.",
       // ],
       // image: "/educacao/plastico/plastico3.png",
     // },
      //{//
      //  title: "Materiais a confirmar com as cooperativas",
       // items: [
        //  "Sacolas de mercados, sacos de frutas, copinhos descartáveis, pratinhos de festa e garfinhos.",
         // "Bandejas de frios e bandejas de carnes.",
         // "Sacos de ração, sacos de areia de gatos e embalagens de sachês.",
       // ],
     // },
    ],
  },

  // =========================================================
  // VIDRO
  // =========================================================
  vidro: {
    sections: [
      {
        title: "Vidros",
        paragraphs: [
          "Garrafas, potes e frascos, sem tampa e enxaguados.",
          "Vidros quebrados devem ser descartados dentro de uma garrafa PET, caixa ou outro material, além de serem identificados, para segurança de quem faz a coleta.",
        ],
        image: "/educacao/vidro/vidro1.jpg",
      },
      {
        title: "Saiba mais",
        paragraphs: [
          "A grande maioria das embalagens de vidro comuns — como garrafas de bebidas, potes de conserva e copos de vidro — pode ser reciclada infinitas vezes sem perder a qualidade.",
        ],
      },
      {
        title: "O que não pode ser reciclado",
        paragraphs: [
          "Alguns tipos de vidro possuem composições químicas diferentes ou tratamentos térmicos que impedem a reciclagem.",
        ],
        image: "/educacao/vidro/vidro2.jpg",
      },
      {
        title: "Cuidados com o vidro quebrado",
        paragraphs: [
          "Lave levemente os potes e garrafas para tirar restos de comida.",
          "Se o vidro estiver quebrado, coloque os cacos dentro de uma garrafa PET cortada ou dentro de uma caixa de papelão resistente.",
          'Escreva "VIDRO QUEBRADO" na embalagem para proteger os coletores de lixo.',
        ],
        image: "/educacao/vidro/vidro3.jpg",
      },
    ],
  },

  // =========================================================
  // METAL
  // =========================================================
  metal: {
    sections: [
      {
        title: "Metais",
        paragraphs: [
          "Praticamente todos os metais podem ser reciclados e reutilizados infinitas vezes sem perder suas propriedades originais.",
          "Eles são divididos principalmente em dois grandes grupos.",
        ],
        image: "/educacao/metal/metal1.jpg",
      },
      {
        title: "Metais Ferrosos",
        paragraphs: [
          "Contêm ferro em sua composição.",
        ],
      },
      {
        title: "Metais Não Ferrosos",
        paragraphs: [
          "Não possuem ferro ou têm ferro em menor quantidade.",
        ],
        image: "/educacao/metal/metal2.jpg",
      },
      {
        title: "Alguns itens metálicos ou mistos não vão para a reciclagem",
        items: [
          "Esponjas de aço (como Bombril).",
          "Clipes e grampos de papel.",
          "Latas de aerossol, tinta, inseticida ou solventes.",
          "Pilhas e baterias (exigem pontos de coletas especiais).",
        ],
        image: "/educacao/metal/metal3.jpg",
      },
    ],
  },

  // =========================================================
  // ELETRÔNICOS
  // =========================================================
  eletronicos: {
    sections: [
      {
        title: "O que são resíduos eletrônicos?",
        paragraphs: [
          "São equipamentos eletrônicos que não são mais utilizados, como celulares, cabos, carregadores e pequenos aparelhos.",
          "Esses materiais precisam de uma destinação adequada e não devem ser descartados junto com o lixo comum.",
        ],
      },
      {
        title: "Exemplos de eletrônicos",
        items: [
          "Celulares e smartphones.",
          "Cabos e carregadores.",
          "Computadores e periféricos.",
          "Pequenos aparelhos eletrônicos.",
        ],
      },
      {
        title: "Como descartar",
        items: [
          "Não coloque eletrônicos no lixo comum.",
          "Separe os equipamentos dos demais resíduos.",
          //"Procure um ponto de coleta de eletrônicos.",
          //"Quando possível, apague seus dados pessoais antes de entregar o equipamento.",
        ],
      },
    ],
  },

  // =========================================================
  // ÓLEO DE COZINHA
  // =========================================================
  oleo: {
    sections: [
      {
        title: "Óleo de cozinha",
        paragraphs: [
          "O óleo de cozinha usado deve receber uma destinação adequada.",
          "Não despeje óleo usado diretamente na pia, no vaso sanitário ou no solo.",
        ],
     // },
     // {
       //   title: "Como armazenar",
        //items: [
          //"Espere o óleo esfriar após o uso.",
          //"Coloque o óleo usado em uma garrafa PET limpa e seca.",
          //"Feche bem a garrafa.",
          //"Leve a um ponto de coleta adequado.",
        //],
      //},
    //  {
        //title: "Por que não jogar no ralo?",
       // paragraphs: [
         // "O descarte incorreto do óleo pode causar problemas na tubulação e contribuir para a contaminação da água.",
       // ],
      },
    ],
  },

  // =========================================================
  // PILHAS E BATERIAS
  // =========================================================
  pilhas: {
    sections: [
      {
        title: "Pilhas e baterias",
        paragraphs: [
          "Pilhas e baterias devem receber uma destinação específica e não devem ser descartadas junto com o lixo comum.",
        ],
      },
      {
        title: "Exemplos",
        items: [
          "Pilhas comuns.",
          "Pilhas recarregáveis.",
          "Baterias de celulares.",
          "Baterias de equipamentos eletrônicos.",
        ],
      },
      {
        title: "Como descartar",
        items: [
          "Separe pilhas e baterias dos demais resíduos.",
          "Não abra ou desmonte as baterias.",
          "Mantenha-as em local seco enquanto não forem descartadas.",
          "Procure um ponto de coleta específico para pilhas e baterias.",
        ],
      },
    ],
  },

  // =========================================================
  // ORGÂNICOS
  // =========================================================
  organicos: {
    sections: [
      {
        title: "Resíduos orgânicos",
        paragraphs: [
          "São resíduos provenientes principalmente de alimentos e materiais de origem vegetal.",
          "Eles possuem características diferentes dos materiais recicláveis como papel, plástico, vidro e metal.",
        ],
      },
      {
        title: "Exemplos",
        items: [
          "Restos de alimentos.",
          "Cascas de frutas e verduras.",
          "Borra e filtro de café.",
          "Folhas e restos de plantas.",
        ],
      },
      
      
    ],
  },
};

// =========================================================
// PÁGINA
// =========================================================

export default async function MaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const category = RECYCLING_CATEGORIES.find(
    (item) => item.id === id
  );

  const content = CONTENTS[id];

  if (!category || !content) {
    notFound();
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      {/* VOLTAR */}
      <Link
        href="/citizen/educacao"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface"
      >
        <span className="material-symbols-outlined">
          arrow_back
        </span>

        Voltar para Educação
      </Link>

      {/* CABEÇALHO */}
      <section
        className="rounded-3xl p-6 border"
        style={{
          backgroundColor: `${category.color}12`,
          borderColor: `${category.color}35`,
        }}
      >
        <div className="flex items-center gap-4">
          <span
            className="material-symbols-outlined text-[32px] rounded-full p-3"
            style={{
              backgroundColor: `${category.color}22`,
              color: category.color,
            }}
          >
            {category.icon}
          </span>

          <div>
            <p
              className="text-sm font-semibold"
              style={{
                color: category.color,
              }}
            >
              EDUCAÇÃO AMBIENTAL
            </p>

            <h1 className="text-display-lg text-on-surface">
              {category.label}
            </h1>
          </div>
        </div>

        <p className="mt-4 text-body-md text-on-surface-variant">
          {category.guidance}
        </p>
      </section>

      {/* CONTEÚDO */}
      {content.sections.map((section, index) => (
        <section
          key={index}
          className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm"
        >
          {/* TÍTULO */}
          <h2 className="text-xl font-bold text-on-surface">
            {section.title}
          </h2>

          {/* PARÁGRAFOS */}
          {section.paragraphs?.map(
            (paragraph, paragraphIndex) => (
              <p
                key={paragraphIndex}
                className="mt-3 text-body-md text-on-surface-variant"
              >
                {paragraph}
              </p>
            )
          )}

          {/* LISTA */}
          {section.items && (
            <ul className="mt-4 flex flex-col gap-3">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-body-md text-on-surface"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: category.color,
                    }}
                  >
                    check_circle
                  </span>

                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {/* IMAGEM */}
          {section.image && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-outline-variant/30 bg-white">
              <img
                src={section.image}
                alt={`Imagem educativa sobre ${category.label}`}
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </section>
      ))}

      {/* VOLTAR */}
      <Link
        href="/citizen/educacao"
        className="w-full rounded-2xl py-3 text-center font-semibold text-white"
        style={{
          backgroundColor: category.color,
        }}
      >
        Voltar para Educação
      </Link>
    </main>
  );
}