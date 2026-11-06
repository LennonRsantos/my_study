import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

/** 2.25 -> "2h 15min", 0.75 -> "45min", 0 -> "0min" */
export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** 12.46 -> "12,5 h" — for totals where minutes add noise */
export function formatHours(hours: number): string {
  return `${decimal.format(hours)} h`;
}

/** 0.42 -> "42%" */
export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

/** "quinta-feira, 30 de outubro" */
export function formatDayLong(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "qua, 12 nov" */
export function formatDayShort(date: Date): string {
  return format(date, "EEE, d MMM", { locale: ptBR });
}

/** 1470 -> "00:30": wraps past midnight */
export function minutesToTime(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = Math.round(m % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}
