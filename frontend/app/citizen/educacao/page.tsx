import { EducationList } from "./education-list";
import { getDailyTip } from "./categories";

export default function EducacaoPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 pb-28 flex flex-col gap-6">
      <div>
        <h1 className="text-display-lg text-on-surface">Educação Ambiental</h1>
        <p className="text-body-md text-on-surface-variant">
          Aprenda a descartar cada resíduo corretamente e ajude Canoas a reciclar mais.
        </p>
      </div>

      <EducationList />

      <div className="bg-tertiary-container/40 rounded-2xl p-5 border border-outline-variant/30">
        <p className="text-label-lg text-on-surface-variant mb-1">Dica do dia</p>
        <p className="text-body-md text-on-surface">{getDailyTip()}</p>
      </div>
    </main>
  );
}
