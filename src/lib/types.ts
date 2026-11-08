export interface Subject {
  id: string;
  name: string;
  color: string;
  icon?: string; // devicon icon name e.g. "react", or an emoji e.g. "📚"
}

export interface StudySession {
  id: string;
  subjectId: string;
  courseId?: string | null;
  /** Learning path step this session covered. */
  stepId?: string | null;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  hours: number;
  notes: string;
}

export interface DailyGoal {
  hoursPerDay: number;
  /** Planner fatigue limit; null = use hoursPerDay. */
  dailyLimitHours: number | null;
  /** Longest continuous block before the planner suggests a break. */
  maxBlockMinutes: number;
}

export type PracticeType = 'exercise' | 'project' | 'challenge' | 'code_review' | 'reading' | 'other';

export const PRACTICE_TYPE_LABELS: Record<PracticeType, string> = {
  exercise: 'Exercícios',
  project: 'Projeto',
  challenge: 'Desafio',
  code_review: 'Code Review',
  reading: 'Leitura prática',
  other: 'Outro',
};

export interface PracticeSession {
  id: string;
  practiceType: PracticeType;
  subjectId: string | null;
  courseId: string | null;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  hours: number;
  notes: string;
}

export interface FrozenDay {
  id: string;
  frozenDate: string;        // YYYY-MM-DD
  reason: string;
  compensationDate: string;  // YYYY-MM-DD
  compensationHours: number;
  compensated: boolean;
  compensatedAt: string | null;
}

export type GoalPeriod = 'week' | 'month' | 'quarter' | 'semester' | 'year';

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetHours: number;
  subjectId: string | null;
  period: GoalPeriod;
  reward: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  completed: boolean;
  completedAt: string | null;
}

export const PERIOD_LABELS: Record<GoalPeriod, string> = {
  week: 'Semanal',
  month: 'Mensal',
  quarter: 'Trimestral',
  semester: 'Semestral',
  year: 'Anual',
};

export const SUBJECT_COLORS = [
  "#0d9488", "#2563eb", "#7c3aed", "#ea580c", "#16a34a",
  "#db2777", "#ca8a04", "#0891b2", "#4f46e5", "#dc2626",
  "#059669", "#7c2d12", "#1d4ed8", "#9333ea", "#e11d48",
  "#0284c7", "#65a30d", "#c026d3", "#d97706", "#334155",
  "#6366f1", "#14b8a6", "#f43f5e", "#8b5cf6", "#ec4899",
];

export const EMOJI_LIST = [
  "📚", "📖", "📝", "✏️", "🎓", "🧠", "💡", "🎯",
  "📐", "📏", "➗", "🔢", "📊", "🧮", "🧪", "⚗️",
  "🔬", "🧬", "⚛️", "🔭", "🌍", "🗺️", "🏛️", "⚖️",
  "💰", "📈", "🩺", "💊", "🌱", "🎨", "🎵", "🎭",
  "📷", "🎬", "💻", "🤖", "🔧", "🏋️", "🗣️", "✍️",
];

// A single emoji, including flags and sequences such as 👩‍💻.
const EMOJI = /\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)*(‍\p{Extended_Pictographic}(\p{Emoji_Modifier}|️)*)*/u;

export const isEmojiIcon = (icon: string) => EMOJI.test(icon);

export const firstEmoji = (text: string) => text.match(EMOJI)?.[0];

export const DEVICON_LIST = [
  // Languages
  "javascript", "typescript", "python", "java", "csharp", "cplusplus", "c",
  "ruby", "php", "swift", "kotlin", "go", "rust", "dart", "scala",
  "perl", "lua", "haskell", "elixir", "clojure", "erlang", "fsharp",
  "groovy", "objectivec", "coffeescript", "solidity", "zig", "nim",
  // Frontend
  "react", "angular", "vuejs", "svelte", "nextjs", "nuxtjs", "gatsby",
  "ember", "backbonejs", "jquery", "alpinejs", "solidjs", "astro",
  "html5", "css3", "sass", "less", "tailwindcss", "bootstrap", "materialui",
  "bulma", "foundation", "styledcomponents",
  // Backend
  "nodejs", "express", "nestjs", "django", "flask", "spring", "rails",
  "fastapi", "laravel", "phoenix", "dotnetcore", "fastify",
  // Databases
  "postgresql", "mysql", "mongodb", "redis", "firebase", "sqlite",
  "mariadb", "couchdb", "dynamodb", "neo4j", "supabase",
  // DevOps & Cloud
  "docker", "kubernetes", "git", "github", "gitlab", "bitbucket",
  "linux", "bash", "terraform", "ansible", "jenkins", "circleci",
  "githubactions", "vagrant", "nginx", "apache",
  "aws", "azure", "googlecloud", "vercel", "netlify", "heroku",
  "digitalocean", "cloudflare",
  // Design
  "figma", "photoshop", "illustrator", "blender", "canva",
  "sketch", "xd", "inkscape", "gimp", "aftereffects",
  // Mobile & Desktop
  "electron", "flutter", "reactnative", "android", "apple",
  "ionic", "xamarin", "tauri",
  // Game
  "unity", "unrealengine", "godot",
  // Data & ML
  "r", "matlab", "latex", "jupyter", "numpy", "pandas", "tensorflow",
  "pytorch", "opencv", "anaconda", "kaggle",
  // Tools & Others
  "graphql", "webpack", "vite", "babel", "eslint", "prettier",
  "npm", "yarn", "pnpm", "deno", "bun",
  "postman", "insomnia", "swagger",
  "jira", "confluence", "trello", "notion",
  "raspberry", "arduino",
  // AI / LLMs (served via Simple Icons CDN — see SIMPLE_ICONS map below)
  "openai", "chatgpt", "anthropic", "claude", "googlegemini", "googlebard",
  "githubcopilot", "perplexity", "mistral", "meta", "ollama", "huggingface",
  "grok", "deepseek", "midjourney", "stabilityai", "runway", "suno",
  "langchain", "llamaindex", "cursor", "v0", "bolt", "windsurf",
  "codeium", "tabnine", "replit", "lovable", "vercel", "supabase",
  "replicate", "elevenlabs", "n8n", "zapier", "make", "notion",
];

// Icons served from Simple Icons (jsdelivr) instead of Devicon.
// Maps our key -> { slug, color } from simple-icons (https://simpleicons.org/).
export const SIMPLE_ICONS: Record<string, { slug: string; color: string }> = {
  openai: { slug: "openai", color: "#412991" },
  chatgpt: { slug: "openai", color: "#10A37F" },
  anthropic: { slug: "anthropic", color: "#191919" },
  claude: { slug: "claude", color: "#D97757" },
  googlegemini: { slug: "googlegemini", color: "#8E75B2" },
  googlebard: { slug: "googlebard", color: "#886FBF" },
  githubcopilot: { slug: "githubcopilot", color: "#000000" },
  perplexity: { slug: "perplexity", color: "#1FB8CD" },
  mistral: { slug: "mistralai", color: "#FA520F" },
  meta: { slug: "meta", color: "#0467DF" },
  ollama: { slug: "ollama", color: "#000000" },
  huggingface: { slug: "huggingface", color: "#FFD21E" },
  grok: { slug: "x", color: "#000000" },
  deepseek: { slug: "deepseek", color: "#4D6BFE" },
  midjourney: { slug: "midjourney", color: "#000000" },
  stabilityai: { slug: "stabilityai", color: "#330066" },
  runway: { slug: "runway", color: "#000000" },
  suno: { slug: "suno", color: "#000000" },
  langchain: { slug: "langchain", color: "#1C3C3C" },
  llamaindex: { slug: "llamaindex", color: "#1B1B1B" },
  cursor: { slug: "cursor", color: "#000000" },
  v0: { slug: "v0", color: "#000000" },
  bolt: { slug: "bolt", color: "#1389FD" },
  windsurf: { slug: "windsurf", color: "#0CA37F" },
  codeium: { slug: "codeium", color: "#09B6A2" },
  tabnine: { slug: "tabnine", color: "#AC75FA" },
  replit: { slug: "replit", color: "#F26207" },
  lovable: { slug: "lovable", color: "#FF3366" },
  vercel: { slug: "vercel", color: "#000000" },
  supabase: { slug: "supabase", color: "#3FCF8E" },
  replicate: { slug: "replicate", color: "#EA2805" },
  elevenlabs: { slug: "elevenlabs", color: "#000000" },
  n8n: { slug: "n8n", color: "#EA4B71" },
  zapier: { slug: "zapier", color: "#FF4F00" },
  make: { slug: "make", color: "#6D00CC" },
  notion: { slug: "notion", color: "#000000" },
};

export function getSimpleIconColor(icon: string): string | null {
  return SIMPLE_ICONS[icon]?.color ?? null;
}

export function getDeviconUrl(icon: string): string {
  if (SIMPLE_ICONS[icon]) {
    return `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${SIMPLE_ICONS[icon].slug}.svg`;
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}/${icon}-original.svg`;
}

export function getDeviconUrlFallback(icon: string): string {
  if (SIMPLE_ICONS[icon]) {
    return `https://unpkg.com/simple-icons@latest/icons/${SIMPLE_ICONS[icon].slug}.svg`;
  }
  return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${icon}/${icon}-plain.svg`;
}
