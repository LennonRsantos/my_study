import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useTheme, COLOR_THEMES, FESTIVE_THEMES, ColorTheme, FestiveTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/page/PageHeader";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Moon, Sun, Check, ArrowUp, ArrowDown, RotateCcw, GripVertical } from "lucide-react";
import { SIDEBAR_LINKS, getSidebarOrder, setSidebarOrder, resetSidebarOrder } from "@/lib/sidebarOrder";

export default function SettingsPage() {
  const { goal, setGoal } = useStudy();
  const { colorTheme, festiveTheme, isDark, setColorTheme, setFestiveTheme, toggleDark } = useTheme();
  const [hours, setHours] = useState(String(goal.hoursPerDay));
  const [order, setOrder] = useState<string[]>(() => getSidebarOrder());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => { setSidebarOrder(order); }, [order]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setOrder(next);
    setDragIndex(null);
  };

  const handleSave = () => {
    const val = parseFloat(hours);
    if (isNaN(val) || val <= 0) return;
    setGoal({ hoursPerDay: val });
    toast.success("Meta salva");
  };

  const handleColorTheme = (t: ColorTheme) => {
    setColorTheme(t);
    toast.success(`Cor ${COLOR_THEMES[t].label.replace(" (Padrão)", "")} aplicada`);
  };

  const handleFestiveTheme = (t: FestiveTheme) => {
    setFestiveTheme(t);
    if (t === "none") {
      toast.success("Tema festivo removido");
    } else {
      toast.success(`Tema ${FESTIVE_THEMES[t].label} aplicado`);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Configurações" description="Meta diária, aparência e organização do menu." />

      <div className="max-w-4xl divide-y rounded-xl border bg-card">
        <SettingRow title="Meta diária" description="Quantas horas você quer estudar por dia. Usada no dashboard e no calendário.">
          <form className="flex items-end gap-3" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="space-y-2">
              <Label htmlFor="settings-goal">Horas por dia</Label>
              <Input id="settings-goal" className="w-32" type="number" inputMode="decimal" min="0.5" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <Button type="submit" variant="outline">Salvar meta</Button>
          </form>
        </SettingRow>

        <SettingRow title="Modo" description="Claro ou escuro. Vale para este aparelho.">
          <Tabs value={isDark ? "dark" : "light"} onValueChange={(v) => { if ((v === "dark") !== isDark) toggleDark(); }}>
            <TabsList>
              <TabsTrigger value="light"><Sun className="w-4 h-4" aria-hidden />Claro</TabsTrigger>
              <TabsTrigger value="dark"><Moon className="w-4 h-4" aria-hidden />Escuro</TabsTrigger>
            </TabsList>
          </Tabs>
        </SettingRow>

        <SettingRow title="Cor do tema" description="A cor de destaque do app: botões, gráficos e menu.">
          <div role="radiogroup" aria-label="Cor do tema" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((key) => {
              const theme = COLOR_THEMES[key];
              const isActive = colorTheme === key && festiveTheme === "none";
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleColorTheme(key)}
                  className={cn(optionClass(isActive), "flex-col py-3")}
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: theme.preview }}
                  >
                    {isActive && <Check className="h-4 w-4" />}
                  </span>
                  <span className="text-xs">{theme.label.replace(" (Padrão)", "")}</span>
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow title="Tema festivo" description="Cores de uma data comemorativa. Enquanto ativo, substitui a cor do tema.">
          <div role="radiogroup" aria-label="Tema festivo" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(FESTIVE_THEMES) as FestiveTheme[]).map((key) => {
              const theme = FESTIVE_THEMES[key];
              const isActive = festiveTheme === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => handleFestiveTheme(key)}
                  className={cn(optionClass(isActive), "justify-start px-3 py-2.5")}
                >
                  <span aria-hidden className="text-lg leading-none">{theme.emoji}</span>
                  <span className="text-sm">{theme.label}</span>
                  {isActive && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
        </SettingRow>

        <SettingRow
          title="Ordem do menu"
          description="Arraste ou use as setas. A ordem vale dentro de cada grupo do menu."
          action={
            <Button variant="ghost" size="sm" onClick={() => { resetSidebarOrder(); setOrder(getSidebarOrder()); toast.success("Ordem padrão restaurada"); }}>
              <RotateCcw className="w-3.5 h-3.5" />Restaurar padrão
            </Button>
          }
        >
          <ul className="divide-y rounded-lg border">
            {order.map((key, i) => {
              const link = SIDEBAR_LINKS[key];
              if (!link) return null;
              const Icon = link.icon;
              return (
                <li
                  key={key}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(i)}
                  className={cn("flex cursor-grab items-center gap-3 px-3 py-2 active:cursor-grabbing", dragIndex === i && "opacity-50")}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="flex-1 text-sm font-medium">{link.label}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Mover ${link.label} para cima`}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Mover ${link.label} para baixo`}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </SettingRow>
      </div>
    </AppLayout>
  );
}

const optionClass = (active: boolean) =>
  cn(
    "flex items-center gap-2 rounded-lg border text-muted-foreground transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
    active ? "border-foreground bg-muted text-foreground" : "border-border hover:bg-muted/60 hover:text-foreground",
  );

/** One setting: label and explanation on the left, control on the right. */
function SettingRow({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {action && <div className="lg:hidden">{action}</div>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-3 hidden lg:block">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
