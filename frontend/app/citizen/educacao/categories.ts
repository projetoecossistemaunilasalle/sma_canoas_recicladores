export interface RecyclingCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  guidance: string;
}

// Cores seguem o padrão brasileiro de coleta seletiva (Resolução CONAMA 275).
export const RECYCLING_CATEGORIES: RecyclingCategory[] = [
  {
    id: "papel",
    label: "Papel",
    color: "#1E88E5",
    icon: "description",
    guidance:
      "Jornais, revistas, papelão e caixas secos e limpos. Evite papel engordurado, plastificado ou sujo — esses vão pro lixo comum.",
  },
  {
    id: "plastico",
    label: "Plástico",
    color: "#E53935",
    icon: "local_drink",
    guidance:
      "Embalagens, garrafas PET e potes limpos e secos. Retire tampas se forem de material diferente e esvazie qualquer resíduo antes de descartar.",
  },
  {
    id: "vidro",
    label: "Vidro",
    color: "#43A047",
    icon: "wine_bar",
    guidance:
      "Garrafas, potes e frascos, sem tampa e enxaguados. Vidros quebrados devem ser embrulhados em papel e identificados, por segurança de quem coleta.",
  },
  {
    id: "metal",
    label: "Metal",
    color: "#FDD835",
    icon: "settings",
    guidance:
      "Latas de alumínio e aço, tampas e utensílios metálicos. Enxágue latas de alimento antes de descartar.",
  },
  {
    id: "eletronicos",
    label: "Eletrônicos",
    color: "#8E24AA",
    icon: "devices",
    guidance:
      "Celulares, cabos, pilhas e pequenos aparelhos não vão na coleta comum — procure um ponto de coleta de eletrônicos ou entregue numa cooperativa parceira.",
  },
  {
    id: "oleo",
    label: "Óleo de cozinha",
    color: "#FB8C00",
    icon: "water_drop",
    guidance:
      "Guarde em garrafa PET bem fechada e leve a um ponto de coleta — óleo despejado no ralo contamina a água e entope a tubulação.",
  },
  {
    id: "pilhas",
    label: "Pilhas e baterias",
    color: "#6D4C41",
    icon: "battery_alert",
    guidance:
      "Nunca descarte no lixo comum — contêm metais pesados. Leve a um ponto de descarte de eletrônicos/pilhas.",
  },
  {
    id: "organicos",
    label: "Orgânicos",
    color: "#795548",
    icon: "compost",
    guidance:
      "Restos de comida, cascas e borra de café. Se possível, faça compostagem doméstica — senão, vão no lixo comum, nunca na reciclagem.",
  },
];

const DAILY_TIPS = [
  "Lave as embalagens antes de descartar — resíduo de comida contamina todo o material reciclável ao redor.",
  "Papel higiênico usado, guardanapos e papel toalha não são recicláveis, mesmo sendo papel.",
  "Isopor é reciclável, mas poucos pontos aceitam — verifique com a cooperativa mais próxima.",
  "Amasse garrafas PET antes de descartar: ocupam menos espaço no caminhão de coleta.",
  "Caixas de pizza engorduradas vão no lixo comum, não no papel reciclável.",
  "Pote de vidro com tampa metálica: separe os dois materiais antes de descartar.",
  "Sacolas plásticas podem ser reutilizadas várias vezes antes de virar resíduo.",
];

// Determinístico por dia do ano, pra mostrar a mesma dica o dia todo sem
// precisar de estado/banco pra isso.
export function getDailyTip(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}
