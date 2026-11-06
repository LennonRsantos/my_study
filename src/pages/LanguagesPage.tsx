import AppLayout from "@/components/AppLayout";
import { useLanguages, LANGUAGE_LEVEL_LABELS, Language, LanguageLevel } from "@/hooks/useLanguages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/page/PageHeader";
import EmptyState from "@/components/page/EmptyState";
import RowActions from "@/components/page/RowActions";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import { ColorAvatar, LoadingState } from "@/components/page/bits";
import { formatHours } from "@/lib/format";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SUBJECT_COLORS } from "@/lib/types";

export default function LanguagesPage() {
  const { languages, loading, addLanguage, updateLanguage, deleteLanguage } = useLanguages();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Language | null>(null);

  const handleSave = async (v: Omit<Language, "id">) => {
    if (editing) {
      await updateLanguage(editing.id, v);
      toast.success("Linguagem salva");
    } else {
      await addLanguage(v);
      toast.success("Linguagem criada");
    }
    setDialogOpen(false);
    setEditing(null);
  };

  if (loading) return <AppLayout><LoadingState /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Linguagens"
        description="Cada linguagem tem matérias, cursos e sessões próprios, separados do resto dos estudos."
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4" />Nova linguagem</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Editar linguagem" : "Nova linguagem"}</DialogTitle></DialogHeader>
              <LanguageForm initial={editing} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        }
      />

      {languages.length === 0 ? (
        <EmptyState
          framed
          title="Nenhuma linguagem ainda"
          text="Adicione um idioma que você está aprendendo, como inglês ou espanhol, para acompanhar as horas dele à parte."
          action={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4" />Nova linguagem</Button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((l) => (
            <li key={l.id} className="relative flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring">
              <div className="flex items-start gap-4">
                <ColorAvatar color={l.color} name={l.name} className="h-12 w-12 text-lg" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/languages/${l.id}`}
                    className="block truncate font-display text-lg font-semibold outline-none after:absolute after:inset-0 after:rounded-xl"
                  >
                    {l.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{LANGUAGE_LEVEL_LABELS[l.level]}</p>
                </div>
                <div className="relative z-10">
                  <RowActions
                    itemLabel={`linguagem ${l.name}`}
                    deleteWarning="Matérias, cursos e sessões desta linguagem também serão excluídos."
                    onEdit={() => { setEditing(l); setDialogOpen(true); }}
                    onDelete={async () => { await deleteLanguage(l.id); toast.success("Linguagem excluída"); }}
                  />
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Meta</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">{l.target_hours > 0 ? formatHours(l.target_hours) : "Sem meta"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Começou em</dt>
                  <dd className="mt-0.5 font-medium">
                    {l.start_date ? format(parseISO(l.start_date), "d 'de' MMM yyyy", { locale: ptBR }) : "—"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}

function LanguageForm({ initial, onSave, onCancel }: {
  initial: Language | null;
  onSave: (v: Omit<Language, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || SUBJECT_COLORS[1]);
  const [level, setLevel] = useState<LanguageLevel>(initial?.level || "beginner");
  const [targetHours, setTargetHours] = useState<string>(String(initial?.target_hours || 0));
  const [startDate, setStartDate] = useState(initial?.start_date || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="language-name">Nome</Label>
        <Input id="language-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: inglês, espanhol, japonês" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="language-level">Nível</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as LanguageLevel)}>
            <SelectTrigger id="language-level"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(LANGUAGE_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="language-hours">Meta (horas)</Label>
          <Input id="language-hours" type="number" inputMode="decimal" min="0" step="0.5" value={targetHours} onChange={(e) => setTargetHours(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="language-start">Data de início</Label>
        <Input id="language-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Cor</Label>
        <ColorSwatchPicker value={color} onChange={setColor} label="Cor da linguagem" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="language-notes">Anotações <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="language-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button disabled={!name.trim()} onClick={() => onSave({
          name: name.trim(), color, level,
          target_hours: Number(targetHours) || 0,
          start_date: startDate || null,
          notes: notes || null,
        })}>{initial ? "Salvar" : "Criar"}</Button>
      </div>
    </div>
  );
}
