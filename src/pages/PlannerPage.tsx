import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/page/PageHeader";
import { LoadingState } from "@/components/page/bits";
import PlannerTab from "@/components/planner/PlannerTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlanner } from "@/hooks/usePlanner";

export default function PlannerPage() {
  const p = usePlanner();

  return (
    <AppLayout>
      <PageHeader title="Planejador" description="Prazos, metas semanais e blocos de estudo para seus cursos e idiomas." />

      {p.loading ? (
        <LoadingState />
      ) : (
        <Tabs defaultValue="cursos" className="space-y-6">
          <TabsList>
            <TabsTrigger value="cursos">Cursos</TabsTrigger>
            <TabsTrigger value="idiomas">Idiomas</TabsTrigger>
          </TabsList>

          {/* forceMount keeps an open draft when switching tabs. */}
          <TabsContent value="cursos" forceMount className="mt-0 data-[state=inactive]:hidden">
            <PlannerTab
              kind="course"
              items={p.courseItems}
              budgetHours={p.courseBudget}
              frozen={p.frozen}
              blocks={p.blocks}
              done={p.done}
              emptyText="Nenhum curso aberto. Cadastre um curso em Cursos para planejar."
              onSaveSettings={(item, s) => p.saveSettings("course", item.id, s)}
              onReplace={p.replaceBlocks}
            />
          </TabsContent>

          <TabsContent value="idiomas" forceMount className="mt-0 data-[state=inactive]:hidden">
            <PlannerTab
              kind="language"
              items={p.languageItems}
              budgetHours={p.languageBudget}
              frozen={p.frozen}
              blocks={p.blocks}
              done={p.done}
              emptyText="Nenhum idioma cadastrado. Cadastre um idioma em Linguagens para planejar."
              onSaveSettings={(item, s) => p.saveSettings("language", item.id, s)}
              onReplace={p.replaceBlocks}
            />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
