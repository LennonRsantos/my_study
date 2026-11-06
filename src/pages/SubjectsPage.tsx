import AppLayout from "@/components/AppLayout";
import { useStudy } from "@/contexts/StudyContext";
import { useCategories } from "@/hooks/useCategories";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, X } from "lucide-react";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import { useStats } from "@/hooks/useStats";
import { formatHours } from "@/lib/format";
import { Subject, SUBJECT_COLORS, DEVICON_LIST } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryManager } from "@/components/CategoryManager";
import { CategoryBadges } from "@/components/CategoryBadges";
import { CategoryPicker } from "@/components/CategoryPicker";
import { BrandIcon } from "@/components/BrandIcon";

const DeviconImg = ({ icon, size = 24 }: { icon: string; size?: number }) => (
  <BrandIcon icon={icon} size={size} />
);

export default function SubjectsPage() {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudy();
  const { categories, getCategoriesForItem, setItemCategories, getItemsInCategory, addCategory, updateCategory, deleteCategory } = useCategories("subject");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const { subjectRanking } = useStats();
  const hoursBySubject = useMemo(
    () => new Map(subjectRanking.map((r) => [r.subject!.id, r.hours])),
    [subjectRanking],
  );

  const filtered = filterCategory
    ? (() => {
        const ids = new Set(getItemsInCategory(filterCategory, "subject"));
        return subjects.filter((s) => ids.has(s.id));
      })()
    : subjects;

  const handleSave = async (name: string, color: string, icon: string | undefined, categoryIds: string[]) => {
    const id = editing ? editing.id : crypto.randomUUID();
    if (editing) {
      updateSubject({ ...editing, name, color, icon });
    } else {
      addSubject({ id, name, color, icon });
    }
    await setItemCategories(id, "subject", categoryIds);
    setEditing(null);
    setDialogOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Matérias"
        description="As disciplinas em que você divide seu tempo de estudo."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Nova matéria</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar matéria" : "Nova matéria"}</DialogTitle>
              </DialogHeader>
              <SubjectForm
                initial={editing}
                categories={categories}
                initialCategories={editing ? getCategoriesForItem(editing.id, "subject").map((c) => c.id) : []}
                onSave={handleSave}
                onCancel={() => { setDialogOpen(false); setEditing(null); }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="space-y-6">
        <CategoryManager categories={categories} selectedFilter={filterCategory} onSelectFilter={setFilterCategory} onAdd={addCategory} onUpdate={updateCategory} onDelete={deleteCategory} />

        {filtered.length === 0 ? (
          <EmptyState
            framed
            title={filterCategory ? "Nada nesta categoria" : "Nenhuma matéria ainda"}
            text={filterCategory ? "Nenhuma matéria foi marcada com esta categoria." : "Crie as matérias que você estuda. Cada sessão fica ligada a uma delas."}
            action={!filterCategory && <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nova matéria</Button>}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => {
              const cats = getCategoriesForItem(s.id, "subject");
              const hours = hoursBySubject.get(s.id) || 0;
              return (
                <li key={s.id} className="flex items-start gap-4 rounded-xl border bg-card p-4">
                  <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: s.color }}>
                    {s.icon ? <DeviconImg icon={s.icon} size={22} /> : <span className="font-display text-base font-semibold text-white">{s.name.charAt(0).toUpperCase()}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="mt-0.5 text-sm tabular-nums text-muted-foreground">
                      {hours > 0 ? `${formatHours(hours)} estudadas` : "Nenhuma sessão ainda"}
                    </p>
                    {cats.length > 0 && <div className="mt-2"><CategoryBadges categories={cats} /></div>}
                  </div>
                  <RowActions
                    itemLabel={`matéria ${s.name}`}
                    deleteWarning="As sessões ligadas a ela ficam sem matéria."
                    onEdit={() => { setEditing(s); setDialogOpen(true); }}
                    onDelete={() => deleteSubject(s.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

function SubjectForm({
  initial,
  categories,
  initialCategories,
  onSave,
  onCancel,
}: {
  initial: Subject | null;
  categories: { id: string; name: string; color: string }[];
  initialCategories: string[];
  onSave: (name: string, color: string, icon: string | undefined, categoryIds: string[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState<string | undefined>(initial?.icon);
  const [iconSearch, setIconSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return DEVICON_LIST;
    const q = iconSearch.toLowerCase();
    return DEVICON_LIST.filter((i) => i.includes(q));
  }, [iconSearch]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subject-name">Nome</Label>
        <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Matemática" />
      </div>
      <div className="space-y-2">
        <Label id="subject-color-label">Cor</Label>
        <ColorSwatchPicker value={color} onChange={setColor} colors={SUBJECT_COLORS} label="Cor da matéria" />
      </div>
      <div>
        <Label className="flex items-center justify-between">
          <span>Ícone <span className="font-normal text-muted-foreground">(opcional)</span></span>
          {icon && <button type="button" onClick={() => setIcon(undefined)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="w-3 h-3" aria-hidden /> Remover ícone</button>}
        </Label>
        <div className="flex items-center gap-3 mt-2 mb-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }} aria-hidden>
            {icon ? <DeviconImg icon={icon} size={26} /> : <span className="text-white font-bold text-lg">{name ? name.charAt(0).toUpperCase() : "?"}</span>}
          </div>
          <span className="text-sm text-muted-foreground">{icon ? icon : "Nenhum ícone selecionado"}</span>
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label="Buscar ícone" value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} placeholder="Buscar ícone (ex.: react, python)…" className="pl-9" />
        </div>
        <ScrollArea className="h-40 border rounded-lg p-2">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {filteredIcons.map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)} title={i} aria-label={`Ícone ${i}`} aria-pressed={icon === i} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${icon === i ? "ring-2 ring-primary bg-accent" : "hover:bg-secondary"}`}>
                <DeviconImg icon={i} size={24} />
              </button>
            ))}
            {filteredIcons.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-4">Nenhum ícone encontrado</p>}
          </div>
        </ScrollArea>
      </div>
      {categories.length > 0 && (
        <div>
          <Label>Categorias <span className="font-normal text-muted-foreground">(opcional)</span></Label>
          <CategoryPicker categories={categories} selected={selectedCategories} onChange={setSelectedCategories} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), color, icon, selectedCategories)}>
          {initial ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}
