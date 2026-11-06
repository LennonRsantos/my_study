import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Check, X, ChevronRight, FolderTree, CornerDownRight, Settings2 } from "lucide-react";
import RowActions from "@/components/page/RowActions";
import ColorSwatchPicker from "@/components/page/ColorSwatchPicker";
import { ColorDot } from "@/components/page/bits";
import type { Category } from "@/hooks/useCategories";
import { SUBJECT_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

const chipClass = (selected: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    selected
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
  );

interface CategoryManagerProps {
  categories: Category[];
  selectedFilter: string | null;
  onSelectFilter: (id: string | null) => void;
  onAdd: (name: string, color: string, parentId?: string | null) => Promise<string | undefined>;
  onUpdate: (id: string, name: string, color: string, parentId?: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function CategoryManager({
  categories,
  selectedFilter,
  onSelectFilter,
  onAdd,
  onUpdate,
  onDelete,
}: CategoryManagerProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(SUBJECT_COLORS[0]);
  const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined); // undefined = not adding

  const roots = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color);
    setAddingParentId(undefined);
  };

  const startAdd = (parentId: string | null) => {
    setAddingParentId(parentId);
    setEditingId(null);
    setEditName("");
    // Inherit color from parent for visual continuity
    const parent = parentId ? categories.find((c) => c.id === parentId) : null;
    setEditColor(parent?.color || SUBJECT_COLORS[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddingParentId(undefined);
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    if (addingParentId !== undefined) {
      await onAdd(editName.trim(), editColor, addingParentId);
    } else if (editingId) {
      await onUpdate(editingId, editName.trim(), editColor);
    }
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    if (selectedFilter === id) onSelectFilter(null);
  };

  // Selected chip path: show selected leaf with possible parent crumb
  const selected = selectedFilter ? categories.find((c) => c.id === selectedFilter) : null;
  const selectedParent = selected?.parentId ? categories.find((c) => c.id === selected.parentId) : null;

  return (
    <div className="space-y-3">
      {/* Top row: "Todas" + Manage */}
      <div className="flex flex-wrap gap-1.5 items-center" role="group" aria-label="Filtrar por categoria">
        <button
          type="button"
          aria-pressed={selectedFilter === null}
          className={chipClass(selectedFilter === null)}
          onClick={() => onSelectFilter(null)}
        >
          Todas
        </button>

        <Popover open={manageOpen} onOpenChange={(o) => { setManageOpen(o); if (!o) cancelEdit(); }}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(chipClass(false), "border-dashed")}>
              <Settings2 className="w-3.5 h-3.5" aria-hidden /> Categorias
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4" aria-hidden /> Gerenciar categorias
            </p>

            <div className="space-y-1 max-h-72 overflow-y-auto">
              {roots.map((root) => (
                <CategoryNode
                  key={root.id}
                  cat={root}
                  childrenList={childrenOf(root.id)}
                  editingId={editingId}
                  editName={editName}
                  editColor={editColor}
                  addingParentId={addingParentId}
                  onStartEdit={startEdit}
                  onStartAdd={startAdd}
                  onDelete={handleDelete}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                  setEditName={setEditName}
                  setEditColor={setEditColor}
                />
              ))}

              {roots.length === 0 && addingParentId === undefined && (
                <p className="text-xs text-muted-foreground">Nenhuma categoria criada.</p>
              )}

              {addingParentId === null && (
                <div className="mt-1">
                  <EditRow
                    name={editName}
                    color={editColor}
                    onNameChange={setEditName}
                    onColorChange={setEditColor}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                </div>
              )}
            </div>

            {addingParentId === undefined && (
              <Button variant="ghost" size="sm" className="mt-2 w-full text-xs" onClick={() => startAdd(null)}>
                <Plus className="w-3 h-3" /> Nova categoria principal
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Hierarchical filter: roots side-by-side, subs revealed only when root is selected */}
      {roots.length > 0 && (() => {
        const expandedRootId = selected
          ? (selected.parentId ?? selected.id)
          : null;
        const expandedSubs = expandedRootId ? childrenOf(expandedRootId) : [];
        const expandedRoot = expandedRootId ? categories.find((c) => c.id === expandedRootId) : null;

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              {roots.map((root) => {
                const subs = childrenOf(root.id);
                const isSelected = selectedFilter === root.id;
                const isExpanded = expandedRootId === root.id;

                return (
                  <button
                    key={root.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={cn(chipClass(isSelected), isExpanded && !isSelected && "border-foreground/40 text-foreground")}
                    onClick={() => onSelectFilter(isSelected ? null : root.id)}
                  >
                    <ColorDot color={root.color} className="h-2 w-2" />
                    {root.name}
                    {subs.length > 0 && <span className="font-normal opacity-60">{subs.length}</span>}
                  </button>
                );
              })}
            </div>

            {expandedRoot && expandedSubs.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2" role="group" aria-label={`Subcategorias de ${expandedRoot.name}`}>
                <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {expandedSubs.map((sub) => {
                  const subSelected = selectedFilter === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      aria-pressed={subSelected}
                      className={cn(chipClass(subSelected), "h-7")}
                      onClick={() => onSelectFilter(subSelected ? null : sub.id)}
                    >
                      <ColorDot color={sub.color} className="h-2 w-2" />
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {selected && selectedParent && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 pl-2">
          Filtrando por {selectedParent.name}
          <ChevronRight className="w-3 h-3" aria-hidden />
          <span className="font-medium text-foreground">{selected.name}</span>
        </p>
      )}
    </div>
  );
}

function CategoryNode({
  cat,
  childrenList,
  editingId,
  editName,
  editColor,
  addingParentId,
  onStartEdit,
  onStartAdd,
  onDelete,
  onSave,
  onCancel,
  setEditName,
  setEditColor,
}: {
  cat: Category;
  childrenList: Category[];
  editingId: string | null;
  editName: string;
  editColor: string;
  addingParentId: string | null | undefined;
  onStartEdit: (c: Category) => void;
  onStartAdd: (parentId: string | null) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onCancel: () => void;
  setEditName: (v: string) => void;
  setEditColor: (v: string) => void;
}) {
  const isEditingThis = editingId === cat.id;
  const isAddingHere = addingParentId === cat.id;

  return (
    <div>
      {isEditingThis ? (
        <EditRow
          name={editName}
          color={editColor}
          onNameChange={setEditName}
          onColorChange={setEditColor}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <div className="flex items-center gap-2 group rounded-md px-1.5 py-1 hover:bg-muted/50">
          <ColorDot color={cat.color} />
          <span className="text-sm flex-1 truncate font-medium">{cat.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Adicionar subcategoria em ${cat.name}`}
            onClick={() => onStartAdd(cat.id)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <RowActions
            itemLabel={`categoria ${cat.name}`}
            deleteWarning={childrenList.length > 0 ? "As subcategorias também serão excluídas." : undefined}
            onEdit={() => onStartEdit(cat)}
            onDelete={() => onDelete(cat.id)}
          />
        </div>
      )}

      {(childrenList.length > 0 || isAddingHere) && (
        <div className="ml-3 pl-2 border-l space-y-1 mt-1">
          {childrenList.map((child) =>
            editingId === child.id ? (
              <EditRow
                key={child.id}
                name={editName}
                color={editColor}
                onNameChange={setEditName}
                onColorChange={setEditColor}
                onSave={onSave}
                onCancel={onCancel}
              />
            ) : (
              <div key={child.id} className="flex items-center gap-2 group rounded-md px-1.5 py-1 hover:bg-muted/50">
                <ColorDot color={child.color} className="h-2 w-2" />
                <span className="text-sm flex-1 truncate">{child.name}</span>
                <RowActions
                  itemLabel={`subcategoria ${child.name}`}
                  onEdit={() => onStartEdit(child)}
                  onDelete={() => onDelete(child.id)}
                />
              </div>
            )
          )}
          {isAddingHere && (
            <EditRow
              name={editName}
              color={editColor}
              onNameChange={setEditName}
              onColorChange={setEditColor}
              onSave={onSave}
              onCancel={onCancel}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EditRow({
  name,
  color,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
}: {
  name: string;
  color: string;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-1.5 p-2 border rounded-md bg-muted/30">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Nome da categoria"
        aria-label="Nome da categoria"
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
      />
      <div className="[&_[role=radio]]:h-6 [&_[role=radio]]:w-6">
        <ColorSwatchPicker value={color} onChange={onColorChange} colors={SUBJECT_COLORS} label="Cor da categoria" />
      </div>
      <div className="flex gap-1 justify-end">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3" />Cancelar
        </Button>
        <Button size="sm" className="h-7 text-xs" disabled={!name.trim()} onClick={onSave}>
          <Check className="w-3 h-3" />Salvar
        </Button>
      </div>
    </div>
  );
}
