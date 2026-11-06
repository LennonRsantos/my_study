import { ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

export interface ChartTable {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}

interface ChartCardProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Screen-reader twin of the chart: every value stays reachable without hover. */
  table?: ChartTable;
  className?: string;
  children: ReactNode;
}

export default function ChartCard({ title, description, action, table, className, children }: ChartCardProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("rounded-xl border bg-card p-5 sm:p-6", className)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold leading-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      {children}
      {table && (
        <table className="sr-only">
          <caption>{table.caption}</caption>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
