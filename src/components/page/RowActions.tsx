import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RowActionsProps {
  /** What the row is, for labels: "matéria Cálculo", "sessão de 12 out". */
  itemLabel: string;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  /** Extra sentence in the confirm dialog, e.g. what else gets removed. */
  deleteWarning?: string;
}

/** Edit + delete icon buttons. Delete always asks first. */
export default function RowActions({ itemLabel, onEdit, onDelete, deleteWarning }: RowActionsProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {onEdit && (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label={`Editar ${itemLabel}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirming(true)}
            aria-label={`Excluir ${itemLabel}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <ConfirmDelete
            open={confirming}
            onOpenChange={setConfirming}
            itemLabel={itemLabel}
            warning={deleteWarning}
            onConfirm={onDelete}
          />
        </>
      )}
    </div>
  );
}

export function ConfirmDelete({
  open, onOpenChange, itemLabel, warning, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  warning?: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {itemLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {warning ? `${warning} ` : ""}Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onConfirm()}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
