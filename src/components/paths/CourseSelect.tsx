import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ColorDot } from "@/components/page/bits";
import type { Course } from "@/hooks/useCourses";

/** Picks a course in progress. The current value stays listed even after its course is completed. */
export default function CourseSelect({
  id, courses, value, onChange,
}: {
  id: string;
  courses: Course[];
  value: string | null;
  onChange: (courseId: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Curso em andamento <span className="font-normal text-muted-foreground">(opcional)</span></Label>
      <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <SelectTrigger id={id}><SelectValue placeholder="Nenhum curso" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          {courses.filter((c) => !c.completed || c.id === value).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <ColorDot color={c.color} />
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
