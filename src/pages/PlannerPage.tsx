import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/page/PageHeader";
import { LoadingState } from "@/components/page/bits";
import PlannerTab from "@/components/planner/PlannerTab";
import PlannerLimitsDialog from "@/components/planner/PlannerLimitsDialog";
import FiveMinuteDialog from "@/components/planner/FiveMinuteDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanner } from "@/hooks/usePlanner";

export default function PlannerPage() {
  const p = usePlanner();
  const shared = {
    frozen: p.frozen,
    blocks: p.blocks,
    done: p.done,
    reserved: p.reserved,
    limitHours: p.courseBudget,
    maxBlockMinutes: p.maxBlockMinutes,
    onReplace: p.replaceBlocks,
    onSetStatus: p.setBlockStatus,
    onReschedule: p.rescheduleBlock,
  };

  return (
    <AppLayout>
      <PageHeader title="Planejador" description="Prazos, metas semanais e blocos de estudo para seus cursos e idiomas." />

      {p.loading ? (
        <LoadingState />
      ) : (
        <Tabs defaultValue="cursos" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="cursos">Cursos</TabsTrigger>
              <TabsTrigger value="idiomas">Idiomas</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap gap-2">
              <FiveMinuteDialog courses={p.activeCourses} />
              <PlannerLimitsDialog
                dailyLimitHours={p.dailyLimitHours}
                maxBlockMinutes={p.maxBlockMinutes}
                goalHours={p.goalHours}
                onSave={p.saveLimits}
              />
            </div>
          </div>

          {/* forceMount keeps an open draft when switching tabs. */}
          <TabsContent value="cursos" forceMount className="mt-0 data-[state=inactive]:hidden">
            <PlannerTab
              kind="course"
              items={p.courseItems}
              budgetHours={p.courseBudget}
              {...shared}
              emptyText="Nenhum curso aberto. Cadastre um curso em Cursos para planejar."
              onSaveSettings={(item, s, w) => p.saveSettings("course", item.id, s, w)}
            />
          </TabsContent>

          <TabsContent value="idiomas" forceMount className="mt-0 data-[state=inactive]:hidden">
            <PlannerTab
              kind="language"
              items={p.languageItems}
              budgetHours={p.languageBudget}
              {...shared}
              emptyText="Nenhum idioma cadastrado. Cadastre um idioma em Linguagens para planejar."
              onSaveSettings={(item, s) => p.saveSettings("language", item.id, s)}
            />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
