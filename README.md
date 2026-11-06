# MetaStudy

Gestor de estudos: organize e acompanhe seus estudos diários com dashboards, calendário e estatísticas.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth)

## Rodando localmente

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

## Banco de dados

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

- `npm run dev`: servidor de desenvolvimento
- `npm run build`: build de produção em `dist/`
- `npm run preview`: serve o build
- `npm test`: testes (Vitest)
- `npm run lint`: ESLint
