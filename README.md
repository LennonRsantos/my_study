<div align="center">

# MetaStudy

**Seu gestor de estudos pessoal: registre, planeje e acompanhe cada hora estudada.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Auth-3FCF8E?logo=supabase&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white)

</div>

---

## Sobre

O MetaStudy reúne em um só lugar tudo o que você estuda: matérias, cursos, idiomas e trilhas de aprendizado. Cada sessão registrada alimenta dashboards, um mapa de consistência anual e um planejador que distribui seu tempo diário até o prazo de cada curso.

Funciona no navegador e como app de desktop para Windows.

## Funcionalidades

| Área | O que faz |
| --- | --- |
| **Dashboard** | Horas do dia vs. meta, sequência (streak) atual e recorde, mapa de calor anual, gráficos por matéria e por curso. |
| **Sessões** | Registro manual ou por cronômetro, vínculo com curso, módulo e submódulos, anotações livres. Agrupadas por dia. |
| **Pomodoro** | Timer configurável ligado a cursos e matérias; a sessão é registrada ao final. |
| **Calendário** | Visão mensal das sessões de estudo e práticas de idiomas. |
| **Cursos** | Carga horária, módulos e aulas. Importação de módulos/aulas por JSON (vários formatos) e reimportação que sincroniza aulas existentes. |
| **Trilhas** | Trilhas de aprendizado em formato de roadmap, com cursos vinculados e importação por JSON. |
| **Planejador** | Divide o tempo diário entre cursos, avisa prazos inviáveis, recalcula a rota quando sessões não acontecem, modo "5 minutos" com microtarefas e revisão espaçada automática. |
| **Idiomas** | Nível, cursos, matérias e sessões de prática por idioma, com dashboard próprio. |
| **Metas** | Metas com progresso automático, concluídas ao atingir 100%. |
| **Categorias** | Hierarquia de categorias e subcategorias para organizar matérias. |
| **Temas** | 9 temas de cor, 7 temas festivos e modo claro/escuro. |
| **Admin** | Gestão de usuários com papéis (RBAC) e políticas RLS no banco. |

## Stack

- **Front-end:** React 18, TypeScript, Vite, React Router, TanStack Query
- **UI:** Tailwind CSS, shadcn/ui (Radix UI), lucide-react, Recharts
- **Back-end:** Supabase (Postgres, Auth, Row Level Security)
- **Desktop:** Electron + electron-builder
- **Qualidade:** Vitest, Testing Library, Playwright, ESLint

## Estrutura

```
src/
├── pages/         # Uma página por rota (Dashboard, Sessões, Cursos, Planejador...)
├── components/
│   ├── ui/        # Primitivos shadcn/ui
│   ├── page/      # Padrões de página (PageHeader, EmptyState, StatRow...)
│   ├── dashboard/ # Gráficos, heatmap e painéis
│   ├── paths/     # Trilhas em roadmap
│   └── planner/   # Planejador e revisões
├── contexts/      # Auth, dados de estudo e temas
├── hooks/         # Hooks de dados e utilitários
├── lib/           # Regras de negócio puras (planner, import, streak...)
└── test/          # Testes Vitest
supabase/migrations/  # Schema completo do banco
electron/             # Processo principal do app desktop
```

## Começando

**Pré-requisitos:** Node.js 18+ e um projeto no [Supabase](https://supabase.com).

1. Crie um arquivo `.env` na raiz com as chaves do seu projeto Supabase:

   ```env
   VITE_SUPABASE_PROJECT_ID="<project-ref>"
   VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
   ```

2. Instale as dependências e inicie o servidor:

   ```sh
   npm install
   npm run dev
   ```

3. Acesse http://localhost:8080.

### Banco de dados

O schema completo está em `supabase/migrations/`. Para aplicar em um projeto novo:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## App de desktop (Windows)

O app de desktop é o mesmo build web dentro de uma janela Electron (`electron/main.cjs`).

- `npm run app:dev`: abre o app com hot reload (Vite + Electron)
- `npm run app:start`: gera o build e abre o app em modo produção, sem instalar
- `npm run app:build`: gera o instalador em `release/MetaStudy Setup <versão>.exe`

O instalador não tem assinatura digital, então o Windows SmartScreen mostra um aviso na primeira execução: clique em "Mais informações" → "Executar assim mesmo".

As chaves do `.env` entram no build. Depois de trocar o `.env`, rode `npm run app:build` de novo.

## Hospedar no navegador

O build web não depende do Electron:

```sh
npm run build
```

Publique a pasta `dist/` em qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages). Configure o fallback de SPA para `index.html`, porque o app usa rotas do `BrowserRouter`. Depois, no Supabase, coloque a URL do site em Authentication → URL Configuration.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build |
| `npm test` | Testes (Vitest) |
| `npm run lint` | ESLint |
| `npm run app:dev` | App desktop com hot reload |
| `npm run app:build` | Instalador Windows |

## Design system

Tokens de cor, tipografia, temas e componentes estão documentados em [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

---

<div align="center">
Feito por <a href="https://github.com/LennonRsantos">LennonRsantos</a>
</div>
