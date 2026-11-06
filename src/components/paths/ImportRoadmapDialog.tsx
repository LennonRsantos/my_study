import { useMemo, useState } from "react";
import { Copy, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Course } from "@/hooks/useCourses";
import { ROADMAP_PROMPT, Roadmap, RoadmapNode, parseRoadmapJson } from "@/lib/learningPath";
import CourseSelect from "./CourseSelect";

const MAX_FILE_BYTES = 1024 * 1024;

function PreviewList({ nodes }: { nodes: RoadmapNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-0.5">
      {nodes.map((node, i) => (
        <li key={i}>
          {node.name}
          {node.topics.length > 0 && <PreviewList nodes={node.topics} />}
        </li>
      ))}
    </ul>
  );
}

/** Creates a path from the JSON an AI chat produced out of a roadmap image. */
export default function ImportRoadmapDialog({
  open, onOpenChange, courses, onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  onImport: (roadmap: Roadmap, courseId: string | null) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => (text.trim() ? parseRoadmapJson(text) : null), [text]);
  const roadmap = result?.ok ? result.roadmap : null;

  const reset = () => { setText(""); setName(""); setCourseId(null); };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(ROADMAP_PROMPT);
      toast({ title: "Prompt copiado", description: "Cole num chat de IA junto com a imagem do roadmap." });
    } catch {
      toast({ title: "Não foi possível copiar o prompt", variant: "destructive" });
    }
  };

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast({ title: "Arquivo maior que 1 MB", variant: "destructive" });
      return;
    }
    setText(await file.text());
  };

  const handleCreate = async () => {
    if (!roadmap) return;
    setSaving(true);
    const id = await onImport({ ...roadmap, name: name.trim() || roadmap.name }, courseId);
    setSaving(false);
    if (id) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar roadmap</DialogTitle>
          <DialogDescription>
            Copie o prompt e cole num chat de IA junto com a imagem do roadmap. Depois traga o JSON que a IA devolver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyPrompt}>
              <Copy className="w-4 h-4" />Copiar prompt
            </Button>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-json">JSON do roadmap</Label>
            <Textarea
              id="roadmap-json"
              rows={8}
              className="font-mono text-xs"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={result?.ok === false}
              aria-describedby={result?.ok === false ? "roadmap-json-error" : undefined}
            />
            {result?.ok === false && <p id="roadmap-json-error" className="text-xs text-destructive">{result.error}</p>}
          </div>

          {roadmap && (
            <>
              <div className="space-y-2">
                <Label htmlFor="roadmap-name">Nome da trilha</Label>
                <Input id="roadmap-name" value={name || roadmap.name} onChange={(e) => setName(e.target.value)} />
              </div>
              <CourseSelect id="roadmap-course" courses={courses} value={courseId} onChange={setCourseId} />
              <div className="space-y-2">
                <p className="text-sm font-medium">Prévia</p>
                <div className="max-h-56 overflow-y-auto rounded-md border p-3 text-sm">
                  <PreviewList nodes={roadmap.steps} />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={!roadmap || saving}>Criar trilha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
