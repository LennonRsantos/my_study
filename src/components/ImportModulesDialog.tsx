import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatHours } from "@/lib/format";
import { parseCourseJson, type ImportedModule } from "@/lib/courseImport";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Creates a course's modules and lessons from the JSON exported by the course platform. */
export default function ImportModulesDialog({ open, onOpenChange, onImport }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (modules: ImportedModule[]) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => (text.trim() ? parseCourseJson(text) : null), [text]);
  const modules = result?.ok ? result.modules : null;
  const lessons = modules?.flatMap((m) => m.lessons) ?? [];
  const hours = lessons.reduce((a, l) => a + (l.durationSeconds ?? 0), 0) / 3600;
  const doneCount = lessons.filter((l) => l.completed).length;

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Arquivo maior que 2 MB");
      return;
    }
    setText(await file.text());
  };

  const handleImport = async () => {
    if (!modules) return;
    setSaving(true);
    const imported = await onImport(modules);
    setSaving(false);
    if (imported) { setText(""); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setText(""); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar módulos</DialogTitle>
          <DialogDescription>
            Envie o JSON do curso. Os módulos e as aulas são criados aqui, e as aulas já concluídas vêm marcadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button type="button" size="sm" variant="outline" asChild>
            <label className="cursor-pointer">
              <Upload className="w-4 h-4" />Enviar arquivo .json
              <input
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }}
              />
            </label>
          </Button>

          <div className="space-y-2">
            <Label htmlFor="course-json">JSON do curso</Label>
            <Textarea
              id="course-json"
              rows={8}
              className="font-mono text-xs"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={result?.ok === false}
              aria-describedby={result?.ok === false ? "course-json-error" : undefined}
            />
            {result?.ok === false && <p id="course-json-error" className="text-xs text-destructive">{result.error}</p>}
          </div>

          {modules && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Prévia</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {modules.length} módulos, {lessons.length} aulas, {formatHours(hours)}, {doneCount} aulas concluídas
              </p>
              <ol className="max-h-56 list-decimal space-y-0.5 overflow-y-auto rounded-md border p-3 pl-8 text-sm">
                {modules.map((m, i) => <li key={i}>{m.name} ({m.lessons.length})</li>)}
              </ol>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleImport} disabled={!modules || saving}>Importar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
