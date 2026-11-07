import { useState, useMemo } from "react";
import { DEVICON_LIST, EMOJI_LIST, firstEmoji, isEmojiIcon } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrandIcon } from "@/components/BrandIcon";

interface SearchableIconPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchableIconPicker({ value, onValueChange, placeholder = "Selecionar ícone" }: SearchableIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return [...EMOJI_LIST, ...DEVICON_LIST];
    const emoji = firstEmoji(search);
    if (emoji) return [emoji];
    const q = search.toLowerCase();
    return DEVICON_LIST.filter(icon => icon.toLowerCase().includes(q));
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          {value ? (
            <>
              <BrandIcon icon={value} size={20} />
              <span className={isEmojiIcon(value) ? "" : "capitalize"}>{value}</span>
              <X
                className="w-4 h-4 ml-auto opacity-50 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); onValueChange(""); }}
              />
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="flex items-center gap-2 px-2 pb-2 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar ícone ou colar emoji…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <ScrollArea className="h-60 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum ícone encontrado</p>
          ) : (
            <div className="grid grid-cols-5 gap-1">
              {filtered.map(icon => (
                <button
                  key={icon}
                  className={`flex flex-col items-center gap-1 p-2 rounded-md hover:bg-accent transition-colors ${value === icon ? "bg-accent ring-1 ring-primary" : ""}`}
                  onClick={() => { onValueChange(icon); setOpen(false); setSearch(""); }}
                  title={icon}
                >
                  <BrandIcon icon={icon} size={24} />
                  {!isEmojiIcon(icon) && <span className="text-[9px] text-muted-foreground truncate w-full text-center">{icon}</span>}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
