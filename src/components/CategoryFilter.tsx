import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { Category } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <Tag className="w-4 h-4 text-muted-foreground" />
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        className="h-7 text-xs"
        onClick={() => onSelect(null)}
      >
        Todas
      </Button>
      {categories.map((c) => (
        <Button
          key={c.id}
          variant={selected === c.id ? "default" : "outline"}
          size="sm"
          className={cn("h-7 text-xs")}
          style={selected === c.id ? { backgroundColor: c.color, borderColor: c.color } : { borderColor: c.color, color: c.color }}
          onClick={() => onSelect(selected === c.id ? null : c.id)}
        >
          {c.name}
        </Button>
      ))}
    </div>
  );
}
