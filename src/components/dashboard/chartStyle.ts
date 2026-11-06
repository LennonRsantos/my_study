/** Shared axis/grid styling so every chart reads as one system. */
export const axisTick = { fill: "hsl(var(--chart-axis))", fontSize: 12 };
export const gridStroke = "hsl(var(--chart-grid))";
export const hourTick = (v: number) => `${v}h`;
