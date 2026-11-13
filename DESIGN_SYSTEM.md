# MetaStudy Design System

Referência de tokens, temas, tipografia e componentes do MetaStudy. A fonte da verdade é o código; este documento aponta onde cada coisa vive e como usá-la.

| Camada | Arquivo |
| --- | --- |
| Tokens (CSS variables) | [`src/index.css`](src/index.css) |
| Mapeamento Tailwind | [`tailwind.config.ts`](tailwind.config.ts) |
| Temas de cor e festivos | [`src/contexts/ThemeContext.tsx`](src/contexts/ThemeContext.tsx) |
| Primitivos | [`src/components/ui/`](src/components/ui/) |
| Padrões de página | [`src/components/page/`](src/components/page/) |
| Dashboard e gráficos | [`src/components/dashboard/`](src/components/dashboard/) |

## Sumário

1. [Princípios](#princípios)
2. [Cores](#cores)
3. [Temas](#temas)
4. [Tipografia](#tipografia)
5. [Forma, espaço e movimento](#forma-espaço-e-movimento)
6. [Ícones](#ícones)
7. [Componentes](#componentes)
8. [Regras de uso](#regras-de-uso)
9. [Como estender](#como-estender)

---

## Princípios

- **Tokens primeiro.** Toda cor de interface vem de uma variável semântica. Nenhum hex solto em componentes.
- **Semântica, não aparência.** Use `primary`, `muted`, `destructive`; o tema decide o tom.
- **Claro e escuro com o mesmo código.** Os tokens mudam sob a classe `.dark`; os componentes não mudam.
- **Composição sobre variação.** Padrões de página (`PageHeader`, `EmptyState`, `StatRow`) mantêm as telas consistentes.
- **Acessível por padrão.** Primitivos Radix cuidam de foco, teclado e ARIA. Gráficos oferecem tabela alternativa.

## Cores

Os tokens são definidos em HSL sem `hsl()` (ex.: `0 75% 45%`), para permitir opacidade no Tailwind (`bg-primary/10`).

```css
/* src/index.css */
:root { --primary: 0 75% 45%; }
.dark { --primary: 0 80% 55%; }
```

```ts
// tailwind.config.ts
primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" }
```

```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90" />
```

### Superfícies e texto

| Token | Classe | Uso | Light | Dark |
| --- | --- | --- | --- | --- |
| `--background` | `bg-background` | Fundo da página | `220 16% 97%` | `222 14% 7%` |
| `--foreground` | `text-foreground` | Texto principal | `222 22% 10%` | `220 14% 94%` |
| `--card` | `bg-card` | Cartões | `0 0% 100%` | `222 12% 10%` |
| `--popover` | `bg-popover` | Menus, popovers | `0 0% 100%` | `222 12% 11%` |
| `--muted` | `bg-muted` | Fundos discretos | `220 14% 94%` | `222 10% 15%` |
| `--muted-foreground` | `text-muted-foreground` | Texto secundário | `220 9% 40%` | `220 8% 62%` |
| `--secondary` | `bg-secondary` | Botões secundários | `220 14% 94%` | `222 10% 16%` |
| `--border` | `border-border` | Bordas (padrão global) | `220 13% 90%` | `222 10% 17%` |
| `--input` | `border-input` | Bordas de campos | `220 13% 88%` | `222 10% 19%` |

Cada token de superfície tem um par `-foreground` para o texto sobre ele (`card-foreground`, `popover-foreground`, `secondary-foreground`).

### Marca e interação

| Token | Classe | Uso | Light | Dark |
| --- | --- | --- | --- | --- |
| `--primary` | `bg-primary` | Ação principal, destaque | `0 75% 45%` | `0 80% 55%` |
| `--accent` | `bg-accent` | Hover, item ativo | `0 0% 12%` | `0 0% 20%` |
| `--ring` | `ring-ring` | Anel de foco | `0 75% 45%` | `0 80% 55%` |

> Os valores acima são o fallback do CSS. Em tempo de execução o tema de cor ativo (padrão **Teal**) sobrescreve `primary`, `accent`, `ring`, `sidebar-*` e `chart-1`. Veja [Temas](#temas).

### Estado

| Token | Classe | Uso | Light | Dark |
| --- | --- | --- | --- | --- |
| `--destructive` | `bg-destructive` | Excluir, erro | `0 75% 45%` | `0 75% 50%` |
| `--success` | `bg-success` | Concluído, meta batida | `142 71% 45%` | `142 71% 45%` |
| `--warning` | `bg-warning` | Prazo em risco | `38 92% 50%` | `38 92% 50%` |
| `--info` | `bg-info` | Dicas, informação | `199 80% 42%` | `199 80% 58%` |

### Gráficos

| Token | Classe | Light | Dark |
| --- | --- | --- | --- |
| `--chart-1` | `fill-chart-1` | `0 75% 45%` | `0 80% 55%` |
| `--chart-2` | `fill-chart-2` | `0 0% 15%` | `0 0% 80%` |
| `--chart-3` | `fill-chart-3` | `0 0% 45%` | `0 0% 50%` |
| `--chart-4` | `fill-chart-4` | `0 60% 60%` | `0 60% 65%` |
| `--chart-5` | `fill-chart-5` | `0 0% 70%` | `0 0% 30%` |
| `--chart-grid` | — | `220 13% 91%` | `222 10% 16%` |
| `--chart-axis` | — | `220 9% 46%` | `220 8% 58%` |

Em Recharts, use `hsl(var(--chart-1))` direto nas props `fill`/`stroke`. `--chart-grid` e `--chart-axis` alimentam as linhas de grade e os ticks dos eixos.

### Sidebar

A sidebar tem paleta própria (`--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` e pares `-foreground`), exposta como `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent` etc. No modo claro ela continua escura (`222 18% 9%`).

### Cores de dados

Matérias, cursos e categorias têm cor escolhida pelo usuário. A paleta fica em `SUBJECT_COLORS` ([`src/lib/types.ts`](src/lib/types.ts)) e é a única exceção à regra "sem hex": são dados, não estilo de interface. Exiba-as com `ColorDot`, `ColorAvatar` ou `style={{ backgroundColor: color }}`, e escolha com `ColorSwatchPicker`.

## Temas

Gerenciados por `ThemeProvider` / `useTheme()` em [`ThemeContext.tsx`](src/contexts/ThemeContext.tsx).

| Modo | Como funciona |
| --- | --- |
| Claro / escuro | `toggleDark()` alterna a classe `.dark` em `<html>`. |
| Tema de cor | `setColorTheme()` aplica variáveis inline em `<html>` via `applyThemeVars`. |
| Tema festivo | `setFestiveTheme()` substitui o tema de cor enquanto estiver ativo. |

Preferências persistem em `localStorage` (`color-theme`, `festive-theme`).

**Temas de cor (`ColorTheme`)**

| Chave | Rótulo |
| --- | --- |
| `teal` | Teal (padrão) |
| `blue` | Azul |
| `purple` | Roxo |
| `rose` | Rosa |
| `amber` | Âmbar |
| `green` | Verde |
| `orange` | Laranja |
| `slate` | Cinza |
| `red` | Vermelho |

**Temas festivos (`FestiveTheme`)**

`none` (nenhum), `christmas` (Natal), `newyear` (Ano Novo), `easter` (Páscoa), `halloween`, `carnival` (Carnaval), `valentines` (Dia dos Namorados), `junina` (Festa Junina).

Cada tema define um objeto `light` e um `dark` com as variáveis que sobrescreve. Variáveis não listadas mantêm o valor de `src/index.css`.

## Tipografia

| Família | Classe | Uso |
| --- | --- | --- |
| Figtree Variable | `font-sans` (padrão do `body`) | Texto, UI, números |
| Bricolage Grotesque Variable | `font-display` (aplicada a `h1`–`h3`) | Títulos |

As fontes são self-hosted via `@fontsource-variable`, sem dependência de CDN. Títulos usam `text-wrap: balance`. O `body` liga as features `rlig` e `calt`.

Escala sugerida (classes Tailwind):

| Papel | Classes |
| --- | --- |
| Título de página | `text-2xl font-semibold tracking-tight` |
| Título de cartão | `text-base font-semibold` |
| Texto | `text-sm` |
| Legenda / meta | `text-xs text-muted-foreground` |
| Número de destaque | `text-2xl font-semibold tabular-nums` |

## Forma, espaço e movimento

**Raio**

| Token | Valor | Classe |
| --- | --- | --- |
| `--radius` | `0.75rem` | `rounded-lg` |
| — | `calc(var(--radius) - 2px)` | `rounded-md` |
| — | `calc(var(--radius) - 4px)` | `rounded-sm` |

**Container:** centralizado, `padding: 2rem`, largura máxima `1400px` (`2xl`).

**Espaçamento:** escala padrão do Tailwind (base 4px). Use `gap-*` em layouts flex/grid em vez de margens entre irmãos.

**Animações** (`tailwind.config.ts`)

| Classe | Efeito | Uso |
| --- | --- | --- |
| `animate-fade-in` | Opacidade + sobe 8px, 0.3s | Entrada de conteúdo |
| `animate-meter-fill` | `scaleX` 0→1, 0.9s ease-out | Barras de progresso |
| `animate-accordion-down` / `-up` | Altura do Radix, 0.2s | Accordion, Collapsible |

**Utilitário:** `.glass-card` aplica `bg-card/80`, `backdrop-blur-sm`, borda suave e sombra leve.

## Ícones

- **lucide-react** para todos os ícones de interface. Tamanho padrão `h-4 w-4`; em botões com texto, `mr-2`.
- **`BrandIcon`** ([`src/components/BrandIcon.tsx`](src/components/BrandIcon.tsx)) renderiza o ícone escolhido para matérias e cursos.
- **`SearchableIconPicker`** permite escolher ícone por busca; aceita emoji como ícone.

## Componentes

### Primitivos (`src/components/ui/`)

Componentes [shadcn/ui](https://ui.shadcn.com) sobre Radix UI. Edite-os no lugar quando precisar ajustar o visual global.

| Grupo | Componentes |
| --- | --- |
| Ações | `button`, `toggle`, `toggle-group` |
| Formulário | `form`, `input`, `textarea`, `label`, `checkbox`, `radio-group`, `select`, `switch`, `slider`, `input-otp`, `calendar` |
| Overlays | `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `hover-card`, `tooltip`, `dropdown-menu`, `context-menu`, `command` |
| Navegação | `sidebar`, `navigation-menu`, `menubar`, `tabs`, `breadcrumb`, `pagination` |
| Feedback | `alert`, `toast`, `toaster`, `sonner`, `progress`, `skeleton` |
| Dados e layout | `card`, `table`, `badge`, `avatar`, `chart`, `accordion`, `collapsible`, `carousel`, `scroll-area`, `separator`, `resizable`, `aspect-ratio` |

### Padrões de página (`src/components/page/`)

| Componente | Props-chave | Uso |
| --- | --- | --- |
| `PageHeader` | `title`, `description`, `actions`, `leading`, `back` | Cabeçalho de toda página |
| `EmptyState` | `title`, `text`, `action`, `framed` | Lista vazia com chamada para ação |
| `StatRow` / `Delta` | `stats: Stat[]` (`label`, `value`, `sub`) | Linha de KPIs; `Delta` mostra variação |
| `RowActions` / `ConfirmDelete` | `itemLabel`, `onEdit`, `onDelete`, `deleteWarning` | Menu editar/excluir com confirmação |
| `DayGroupedList` | `items`, `getDay`, `getHours`, `getKey`, `renderRow` | Lista agrupada por dia com total de horas |
| `ColorSwatchPicker` | `value`, `onChange`, `colors`, `label` | Seletor de cor de dados |
| `AuthShell` | `title`, `description`, `footer` | Moldura das telas de login/cadastro |
| `bits.tsx` | `ColorDot`, `ColorAvatar`, `HoursProgress`, `LoadingState`, `ListCard` | Peças pequenas reutilizáveis |
| `styles.ts` | `linkClass` | Estilo padrão de link |

### Dashboard (`src/components/dashboard/`)

| Componente | Props-chave | Uso |
| --- | --- | --- |
| `ChartCard` | `title`, `description`, `action`, `table` | Moldura de gráfico; `table` gera alternativa acessível |
| `ChartTooltip` | props do Recharts | Tooltip padrão dos gráficos |
| `RankedBars` | `items: RankedItem[]` | Ranking horizontal (matérias, cursos) |
| `StudyHeatmap` | `hoursByDay`, `frozenSet`, `currentStreak`, `longestStreak` | Mapa de consistência anual |
| `TodayPanel` | `hoursToday`, `goalHours`, `progress`, `streak`, `weekStrip` | Resumo do dia e da semana |
| `ActiveCoursesCard`, `CoursesDashboard` | `insights` | Progresso e ritmo dos cursos |

## Regras de uso

**Faça**

- Use classes de token: `bg-card`, `text-muted-foreground`, `border-border`.
- Combine classes com `cn()` de [`src/lib/utils.ts`](src/lib/utils.ts).
- Comece toda página com `PageHeader` e trate lista vazia com `EmptyState`.
- Envolva gráficos em `ChartCard` e passe `table` com os dados.
- Use `tabular-nums` em números que mudam (timers, horas).
- Confirme exclusões com `RowActions` / `ConfirmDelete`.

**Não faça**

- Hex, `rgb()` ou cores Tailwind fixas (`bg-red-500`) em interface. Exceção: cores de dados do usuário.
- Estilos inline para layout ou espaçamento.
- Recriar um primitivo que já existe em `ui/`.
- Depender só de cor para transmitir estado; adicione texto ou ícone.

## Como estender

**Novo token**

1. Declare a variável em `:root` e `.dark` em `src/index.css`.
2. Mapeie em `theme.extend.colors` no `tailwind.config.ts` como `hsl(var(--nome))`.
3. Documente aqui.

**Novo tema de cor**

1. Adicione a chave ao tipo `ColorTheme`.
2. Adicione a entrada em `COLOR_THEMES` com `label`, `preview`, `light` e `dark`.
3. O seletor em Configurações lista o tema automaticamente.

**Novo primitivo shadcn**

```sh
npx shadcn@latest add <componente>
```

A configuração está em [`components.json`](components.json): estilo `default`, CSS variables ligadas e aliases `@/components/ui`, `@/lib/utils`.
