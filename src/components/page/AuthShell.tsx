import { ReactNode } from "react";
import { BookOpen } from "lucide-react";

// A fixed sample of the study map, so the auth screens preview what the app tracks.
const SAMPLE = "0012430012342100234431002343210012344321002443320123443210".split("").map(Number);
const SAMPLE_LEVEL = ["bg-white/[0.06]", "bg-sidebar-primary/30", "bg-sidebar-primary/55", "bg-sidebar-primary/80", "bg-sidebar-primary"];

function Wordmark({ className, onPage }: { className?: string; onPage?: boolean }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            onPage ? "bg-primary text-primary-foreground" : "bg-sidebar-primary text-sidebar-primary-foreground"
          }`}
        >
          <BookOpen className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="font-display text-xl font-semibold tracking-tight">MetaStudy</span>
      </div>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Split layout for login, signup and password screens. The brand panel hides on small screens. */
export default function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Wordmark />
        <div className="max-w-md">
          <div className="grid w-fit grid-flow-col grid-rows-4 gap-1.5" aria-hidden>
            {SAMPLE.map((l, i) => (
              <span key={i} className={`h-5 w-5 rounded-[4px] ${SAMPLE_LEVEL[l]}`} />
            ))}
          </div>
          <p className="mt-8 font-display text-3xl font-semibold leading-tight tracking-tight">
            Cada hora de estudo vira um quadrado. Mantenha o mapa cheio.
          </p>
          <p className="mt-3 text-sm text-sidebar-foreground/60">
            Registre sessões, acompanhe metas e veja seu ritmo semana a semana.
          </p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Wordmark onPage className="mb-10 lg:hidden" />
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
