import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/page/PageHeader";
import { LoadingState } from "@/components/page/bits";
import EmptyState from "@/components/page/EmptyState";
import { Button } from "@/components/ui/button";
import PlannerTab from "@/components/planner/PlannerTab";
import PlannerLimitsDialog from "@/components/planner/PlannerLimitsDialog";
import FiveMinuteDialog from "@/components/planner/FiveMinuteDialog";
import MonthPlanDialog from "@/components/planner/MonthPlanDialog";
import { usePlanner } from "@/hooks/usePlanner";

export default function PlannerPage() {
  const p = usePlanner();

  return (
    <AppLayout>
      <PageHeader
        title="Planejador"
        description="Sua rotina de estudos a partir dos dias e horas disponíveis e dos cursos, trilhas e idiomas que você registrou."
      />

      {p.error ? (
        <EmptyState
          framed
          title="Não foi possível carregar o planejador"
          text="Verifique sua conexão. Se o problema continuar, o banco pode estar sem a atualização mais recente."
          action={<Button variant="outline" onClick={p.reload}>Tentar de novo</Button>}
        />
      ) : p.loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap justify-end gap-2">
            <FiveMinuteDialog courses={p.activeCourses} />
            <PlannerLimitsDialog
              availableDays={p.availableDays}
              dailyLimitHours={p.dailyLimitHours}
              maxBlockMinutes={p.maxBlockMinutes}
              goalHours={p.goalHours}
              onSave={p.saveAvailability}
            />
            <MonthPlanDialog
              items={p.items}
              availableDays={p.availableDays}
              budgetHours={p.budget}
              dailyLimitHours={p.dailyLimitHours}
              frozen={p.frozen}
              onApply={p.applyMonthPlan}
            />
          </div>

          <PlannerTab
            items={p.items}
            budgetHours={p.budget}
            availableDays={p.availableDays}
            frozen={p.frozen}
            blocks={p.blocks}
            done={p.done}
            reserved={p.reserved}
            maxBlockMinutes={p.maxBlockMinutes}
            onSaveSettings={(item, s, w) => p.saveSettings(item.kind, item.id, s, w)}
            onSetItemStatus={p.setItemStatus}
            onReplace={p.replaceBlocks}
            onSetStatus={p.setBlockStatus}
            onReschedule={p.rescheduleBlock}
          />
        </div>
      )}
    </AppLayout>
  );
}
