import { forwardRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CornerDownRight } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  parentId?: string | null;
}

interface CategoryPickerProps {
  categories: CategoryItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export const CategoryPicker = forwardRef<HTMLDivElement, CategoryPickerProps>(
  ({ categories, selected, onChange }, ref) => {
    if (categories.length === 0) {
      return (
        <p ref={ref as React.Ref<HTMLParagraphElement>} className="text-xs text-muted-foreground">
          Nenhuma categoria criada ainda.
        </p>
      );
    }

    const toggle = (id: string) => {
      onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    };

    // Build hierarchy: roots first, then their children grouped underneath
    const roots = categories.filter((c) => !c.parentId);
    const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
    // Orphans (parent missing) treated as roots
    const orphans = categories.filter(
      (c) => c.parentId && !categories.some((p) => p.id === c.parentId)
    );
    const topLevel = [...roots, ...orphans];

    return (
      <div ref={ref} className="space-y-1.5 max-h-40 overflow-y-auto">
        {topLevel.map((c) => {
          const subs = childrenOf(c.id);
          return (
            <div key={c.id} className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm font-medium">{c.name}</span>
              </label>
              {subs.length > 0 && (
                <div className="ml-3 pl-2 border-l space-y-1" style={{ borderColor: c.color + "55" }}>
                  {subs.map((sub) => (
                    <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={selected.includes(sub.id)} onCheckedChange={() => toggle(sub.id)} />
                      <CornerDownRight className="w-3 h-3 text-muted-foreground" />
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                      <span className="text-sm">{sub.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);
CategoryPicker.displayName = "CategoryPicker";
