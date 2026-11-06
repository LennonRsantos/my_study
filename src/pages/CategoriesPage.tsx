import AppLayout from "@/components/AppLayout";
import { useCategories, Category } from "@/hooks/useCategories";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import { ColorDot, LoadingState } from "@/components/page/bits";
import { toast } from "sonner";
import { SUBJECT_COLORS } from "@/lib/types";

export default function CategoriesPage() {
  const { categories: subjectCats, loading: l1, addCategory: addSub, updateCategory: updSub, deleteCategory: delSub } = useCategories("subject");
  const { categories: courseCats, loading: l2, addCategory: addCrs, updateCategory: updCrs, deleteCategory: delCrs } = useCategories("course");
  const { categories: sessionCats, loading: l3, addCategory: addSes, updateCategory: updSes, deleteCategory: delSes } = useCategories("session");
  const categories = [...subjectCats, ...courseCats, ...sessionCats];
  const loading = l1 || l2 || l3;
  const addCategory = addSub; const updateCategory = updSub; const deleteCategory = delSub;
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSave = async (name: string, color: string) => {
    if (editing) {
      await updateCategory(editing.id, name, color);
      toast.success("Categoria salva");
    } else {
      await addCategory(name, color);
      toast.success("Categoria criada");
    }
    setEditing(null);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    toast.success("Categoria excluída");
  };

  if (loading) return <AppLayout><LoadingState /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Categorias"
        description="Organize sessões, matérias e cursos por categorias."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Nova categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
              <CategoryForm initial={editing} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        }
      />

      {categories.length === 0 ? (
        <EmptyState framed title="Nenhuma categoria ainda" text="Categorias agrupam sessões, matérias e cursos para filtrar depois." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <ColorDot color={c.color} className="h-3 w-3" />
              <span className="flex-1 truncate font-medium">{c.name}</span>
              <RowActions
                itemLabel={`categoria ${c.name}`}
                onEdit={() => { setEditing(c); setDialogOpen(true); }}
                onDelete={() => handleDelete(c.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

function CategoryForm({ initial, onSave, onCancel }: {
  initial: Category | null;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[0]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-name">Nome</Label>
        <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Exatas, Humanas, Projeto X" />
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <ColorSwatchPicker value={color} onChange={setColor} colors={SUBJECT_COLORS.slice(0, 12)} label="Cor da categoria" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={!name.trim()} onClick={() => onSave(name.trim(), color)}>
          {initial ? "Salvar" : "Criar"}
        </Button>
      </div>
    </div>
  );
}
