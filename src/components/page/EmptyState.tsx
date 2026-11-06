import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { linkClass } from "./styles";

interface EmptyStateProps {
  title?: string;
  text: ReactNode;
  /** A route to link to, or any node (e.g. a dialog trigger button). */
  action?: { to: string; label: string } | ReactNode;
  /** Draw its own bordered surface (for use directly on the page, not inside a card). */
  framed?: boolean;
  className?: string;
}

export default function EmptyState({ title, text, action, framed, className }: EmptyStateProps) {
  const isRoute = !!action && typeof action === "object" && "to" in (action as object);
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3",
        framed ? "rounded-xl border border-dashed bg-card/50 px-6 py-10" : "py-6",
        className,
      )}
    >
      {title && <p className="font-display text-lg font-semibold">{title}</p>}
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {isRoute ? (
        <Link to={(action as { to: string }).to} className={linkClass}>
          {(action as { label: string }).label}
        </Link>
      ) : (
        (action as ReactNode)
      )}
    </div>
  );
}
