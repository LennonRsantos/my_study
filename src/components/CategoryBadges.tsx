import { ColorDot } from "@/components/page/bits";

export function CategoryBadges({ categories }: { categories: { id: string; name: string; color: string }[] }) {
  if (categories.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Categorias">
      {categories.map((c) => (
        <li
          key={c.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          <ColorDot color={c.color} className="h-2 w-2" />
          {c.name}
        </li>
      ))}
    </ul>
  );
}
