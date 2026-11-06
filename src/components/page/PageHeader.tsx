import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right (usually the "Nova …" dialog trigger). */
  actions?: ReactNode;
  /** Leading element before the title, e.g. the entity's color avatar. */
  leading?: ReactNode;
  back?: { to?: string; onClick?: () => void; label: string };
}

export default function PageHeader({ title, description, actions, leading, back }: PageHeaderProps) {
  const backClass =
    "mb-4 inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <header className="mb-8">
      {back &&
        (back.to ? (
          <Link to={back.to} className={backClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </Link>
        ) : (
          <button type="button" onClick={back.onClick} className={backClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </button>
        ))}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {leading}
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
