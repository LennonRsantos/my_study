import { KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS } from "@/lib/types";

// Names for screen readers, aligned with SUBJECT_COLORS
const COLOR_NAMES: Record<string, string> = {
  "#0d9488": "verde-azulado", "#2563eb": "azul", "#7c3aed": "violeta", "#ea580c": "laranja", "#16a34a": "verde",
  "#db2777": "rosa", "#ca8a04": "mostarda", "#0891b2": "ciano", "#4f46e5": "índigo", "#dc2626": "vermelho",
  "#059669": "esmeralda", "#7c2d12": "marrom", "#1d4ed8": "azul escuro", "#9333ea": "roxo", "#e11d48": "framboesa",
  "#0284c7": "azul céu", "#65a30d": "verde-limão", "#c026d3": "magenta", "#d97706": "âmbar", "#334155": "grafite",
  "#6366f1": "lavanda", "#14b8a6": "turquesa", "#f43f5e": "coral", "#8b5cf6": "lilás", "#ec4899": "pink",
};

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
  label?: string;
}

/** Radio group of color swatches; arrow keys move the selection. */
export default function ColorSwatchPicker({ value, onChange, colors = SUBJECT_COLORS.slice(0, 15), label = "Cor" }: ColorSwatchPickerProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const i = Math.max(colors.indexOf(value), 0);
    const next = colors[(i + delta + colors.length) % colors.length];
    onChange(next);
    (e.currentTarget.querySelector(`[data-color="${next}"]`) as HTMLButtonElement | null)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
      {colors.map((c) => {
        const selected = c.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={COLOR_NAMES[c] ?? c}
            data-color={c}
            tabIndex={selected || (!colors.includes(value) && c === colors[0]) ? 0 : -1}
            onClick={() => onChange(c)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "hover:scale-110",
            )}
            style={{ backgroundColor: c }}
          >
            {selected && <Check className="h-4 w-4" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
