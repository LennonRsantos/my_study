import { Link } from "react-router-dom";
import type { CourseInsights } from "@/hooks/useCourseInsights";
import { ColorDot } from "@/components/page/bits";
import { linkClass } from "@/components/page/styles";
import { formatHours, formatPercent } from "@/lib/format";
import ChartCard from "./ChartCard";

const MAX_COURSES = 3;

/** Compact progress of the most recently active courses, for the general dashboard. */
export default function ActiveCoursesCard({ insights }: { insights: CourseInsights }) {
  if (insights.loading || insights.active.length === 0) return null;
  const shown = insights.active.slice(0, MAX_COURSES);

  return (
    <ChartCard
      title="Cursos em andamento"
      description={
        insights.active.length > MAX_COURSES
          ? `Os ${MAX_COURSES} com atividade mais recente, de ${insights.active.length}.`
          : "Progresso pelos módulos concluídos ou pela carga horária."
      }
      action={<Link to="/?aba=cursos" className={linkClass}>Ver detalhes</Link>}
    >
      <ul className="grid gap-6 md:grid-cols-3">
        {shown.map((i) => (
          <li key={i.course.id} className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ColorDot color={i.course.color} />
              <span className="truncate">{i.course.name}</span>
            </p>
            <div
              role="progressbar"
              aria-label={`Progresso do curso ${i.course.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(i.progress * 100)}
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${i.progress * 100}%` }} />
            </div>
            <p className="mt-2 flex justify-between gap-3 text-xs tabular-nums text-muted-foreground">
              <span className="truncate">
                {i.modulesTotal > 0
                  ? `${i.modulesDone} de ${i.modulesTotal} módulos`
                  : i.totalHours > 0
                    ? `${formatHours(i.dedicatedHours)} de ${formatHours(i.totalHours)}`
                    : `${formatHours(i.dedicatedHours)} dedicadas`}
              </span>
              {i.totalHours > 0 && <span>{formatPercent(i.progress)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
