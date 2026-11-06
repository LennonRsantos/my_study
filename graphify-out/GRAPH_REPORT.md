# Graph Report - metastudy-main  (2026-11-06)

## Corpus Check
- 168 files · ~60,513 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .css 2, .mdc 1)

## Summary
- 950 nodes · 3193 edges · 51 communities (35 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Routing and Shell
- Dashboard Charts
- Brand and Icon Picker
- Accordion and Avatar UI
- Package Dependencies
- Sidebar Navigation
- Sidebar and Sheet Primitives
- Toast Notifications
- Dev Tooling Dependencies
- Package Manifest
- Row Actions and Delete Confirm
- NavLink and Hover Card
- App TypeScript Config
- Electron Main Process
- shadcn Config
- Node TypeScript Config
- Electron Builder Config
- Carousel
- Alert Components
- HTML Shell and Assets
- Form Components
- ESLint Config
- npm Scripts
- Chart Components
- Command Palette
- Supabase Types
- TypeScript Compiler Config
- Breadcrumb
- Vite and Test Config
- Pagination
- Sheet Components
- Drawer Components
- Navigation Menu
- Toaster Theme
- Input OTP
- Aspect Ratio UI
- Collapsible UI
- Popover UI
- Test Setup
- Accordion Dependency
- Checkbox Dependency
- Dialog Dependency
- Menubar Dependency
- Radio Group Dependency
- Scroll Area Dependency
- Toast Dependency
- Tailwind Merge Dependency
- React Query Dependency
- Crawler Access Rules

## God Nodes (most connected - your core abstractions)
1. `cn()` - 262 edges
2. `react` - 94 edges
3. `Button` - 66 edges
4. `lucide-react` - 48 edges
5. `Input` - 47 edges
6. `Label` - 45 edges
7. `ColorDot()` - 37 edges
8. `useAuth()` - 34 edges
9. `AdminPage()` - 34 edges
10. `DialogContent` - 33 edges

## Surprising Connections (you probably didn't know these)
- `HTML app shell` --references--> `MetaStudy M brand mark`  [EXTRACTED]
  index.html → public/favicon.svg
- `NavLink` --calls--> `cn()`  [EXTRACTED]
  src/components/NavLink.tsx → src/lib/utils.ts
- `AlertTitle` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts
- `AlertDescription` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts
- `BreadcrumbList` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/breadcrumb.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (51 total, 16 thin omitted)

### Community 0 - "App Routing and Shell"
Cohesion: 0.07
Nodes (122): react, react-router-dom, sonner, App(), ProtectedApp(), queryClient, AppLayout(), CategoryBadges() (+114 more)

### Community 1 - "Dashboard Charts"
Cohesion: 0.06
Nodes (78): date-fns, recharts, ActiveCoursesCard(), ChartCard(), ChartCardProps, ChartTable, axisTick, gridStroke (+70 more)

### Community 2 - "Brand and Icon Picker"
Cohesion: 0.07
Nodes (54): BrandIcon(), BrandIconProps, svgCache, SearchableIconPickerProps, StudyContext, StudyContextType, StudyProvider(), HEATMAP_WEEKS (+46 more)

### Community 3 - "Accordion and Avatar UI"
Cohesion: 0.09
Nodes (37): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, Card, CardContent (+29 more)

### Community 4 - "Package Dependencies"
Cohesion: 0.05
Nodes (42): dependencies, class-variance-authority@^0.7.1, cmdk@^1.1.1, date-fns@^3.6.0, input-otp@^1.4.2, lucide-react@^0.462.0, @radix-ui/react-avatar@^1.1.10, @radix-ui/react-context-menu@^2.2.15 (+34 more)

### Community 5 - "Sidebar Navigation"
Cohesion: 0.08
Nodes (34): lucide-react, AppSidebar(), SECTIONS, CategoryFilter(), CategoryFilterProps, CategoryManagerProps, DropdownMenuCheckboxItem, DropdownMenuContent (+26 more)

### Community 6 - "Sidebar and Sheet Primitives"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 7 - "Toast Notifications"
Cohesion: 0.11
Nodes (29): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+21 more)

### Community 8 - "Dev Tooling Dependencies"
Cohesion: 0.06
Nodes (31): devDependencies, autoprefixer@^10.4.21, concurrently@^10.0.6, electron-builder@^26.18.0, eslint@^9.32.0, jsdom@^20.0.3, @playwright/test@^1.57.0, postcss@^8.5.6 (+23 more)

### Community 9 - "Package Manifest"
Cohesion: 0.07
Nodes (29): author, clsx@^2.1.1, embla-carousel-react@^8.6.0, @hookform/resolvers@^3.10.0, @radix-ui/react-alert-dialog@^1.1.14, @radix-ui/react-dropdown-menu@^2.1.15, @radix-ui/react-navigation-menu@^1.2.13, @radix-ui/react-select@^2.2.5 (+21 more)

### Community 10 - "Row Actions and Delete Confirm"
Cohesion: 0.17
Nodes (24): ConfirmDelete(), RowActionsProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+16 more)

### Community 11 - "NavLink and Hover Card"
Cohesion: 0.10
Nodes (12): NavLink, NavLinkCompatProps, HoverCardContent, Progress, RadioGroup, RadioGroupItem, ResizableHandle(), ResizablePanelGroup() (+4 more)

### Community 12 - "App TypeScript Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+12 more)

### Community 13 - "Electron Main Process"
Cohesion: 0.11
Nodes (15): { app, BrowserWindow, protocol, net, shell }, createWindow(), DIST_DIR, fs, isDev, isInternal(), path, { pathToFileURL } (+7 more)

### Community 14 - "shadcn Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 15 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 16 - "Electron Builder Config"
Cohesion: 0.14
Nodes (14): build, appId, directories, files, nsis, productName, win, buildResources (+6 more)

### Community 17 - "Carousel"
Cohesion: 0.19
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 18 - "Alert Components"
Cohesion: 0.22
Nodes (10): class-variance-authority, Alert, AlertDescription, AlertTitle, alertVariants, ToggleGroup, ToggleGroupContext, ToggleGroupItem (+2 more)

### Community 19 - "HTML Shell and Assets"
Cohesion: 0.17
Nodes (10): HTML app shell, SEO and social meta tags, @fontsource-variable/bricolage-grotesque@^5.3.0, @fontsource-variable/figtree@^5.3.0, react-dom@^18.3.1, MetaStudy M brand mark, @fontsource-variable/bricolage-grotesque, @fontsource-variable/figtree (+2 more)

### Community 20 - "Form Components"
Cohesion: 0.23
Nodes (10): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+2 more)

### Community 21 - "ESLint Config"
Cohesion: 0.18
Nodes (10): @eslint/js@^9.32.0, eslint-plugin-react-hooks@^5.2.0, eslint-plugin-react-refresh@^0.4.20, globals@^15.15.0, typescript-eslint@^8.38.0, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+2 more)

### Community 22 - "npm Scripts"
Cohesion: 0.18
Nodes (11): scripts, app:build, app:dev, app:start, build, build:dev, dev, lint (+3 more)

### Community 23 - "Chart Components"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+2 more)

### Community 24 - "Command Palette"
Cohesion: 0.20
Nodes (10): Command, CommandDialog(), CommandDialogProps, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+2 more)

### Community 25 - "Supabase Types"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 26 - "TypeScript Compiler Config"
Cohesion: 0.18
Nodes (10): compilerOptions, allowJs, noImplicitAny, noUnusedLocals, noUnusedParameters, paths, skipLibCheck, strictNullChecks (+2 more)

### Community 27 - "Breadcrumb"
Cohesion: 0.20
Nodes (9): @radix-ui/react-slot@^1.2.3, @radix-ui/react-slot, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage (+1 more)

### Community 28 - "Vite and Test Config"
Cohesion: 0.22
Nodes (6): vite@^5.4.19, @vitejs/plugin-react-swc@^3.11.0, vitest@^3.2.4, vite, @vitejs/plugin-react-swc, vitest

### Community 29 - "Pagination"
Cohesion: 0.24
Nodes (9): ButtonProps, Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem, PaginationLink(), PaginationLinkProps, PaginationNext() (+1 more)

### Community 30 - "Sheet Components"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 31 - "Drawer Components"
Cohesion: 0.29
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 32 - "Navigation Menu"
Cohesion: 0.32
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 33 - "Toaster Theme"
Cohesion: 0.40
Nodes (4): next-themes@^0.3.0, next-themes, Toaster(), ToasterProps

### Community 34 - "Input OTP"
Cohesion: 0.40
Nodes (4): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot

## Knowledge Gaps
- **5 isolated node(s):** `Local .env setup`, `BrowserRouter SPA fallback`, `SEO and social meta tags`, `Crawler access rules`, `MetaStudy M brand mark`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 228 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Accordion and Avatar UI` to `App Routing and Shell`, `Dashboard Charts`, `Brand and Icon Picker`, `Sidebar Navigation`, `Sidebar and Sheet Primitives`, `Toast Notifications`, `Row Actions and Delete Confirm`, `NavLink and Hover Card`, `Carousel`, `Alert Components`, `Form Components`, `Chart Components`, `Command Palette`, `Breadcrumb`, `Pagination`, `Sheet Components`, `Drawer Components`, `Navigation Menu`, `Input OTP`, `Popover UI`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **What connects `Local .env setup`, `BrowserRouter SPA fallback`, `SEO and social meta tags` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Routing and Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.06740984587759988 - nodes in this community are weakly interconnected._
- **Why does `react` connect `App Routing and Shell` to `Dashboard Charts`, `Brand and Icon Picker`, `Accordion and Avatar UI`, `Package Dependencies`, `Sidebar Navigation`, `Sidebar and Sheet Primitives`, `Toast Notifications`, `Package Manifest`, `Row Actions and Delete Confirm`, `NavLink and Hover Card`, `Carousel`, `Alert Components`, `Form Components`, `Chart Components`, `Command Palette`, `Breadcrumb`, `Pagination`, `Sheet Components`, `Drawer Components`, `Navigation Menu`, `Input OTP`, `Popover UI`?**
  _High betweenness centrality (0.174) - this node is a cross-community bridge._
- **Should `Dashboard Charts` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Sidebar Navigation` to `App Routing and Shell`, `Dashboard Charts`, `Brand and Icon Picker`, `Accordion and Avatar UI`, `Package Dependencies`, `Input OTP`, `Navigation Menu`, `Sidebar and Sheet Primitives`, `Toast Notifications`, `Package Manifest`, `Row Actions and Delete Confirm`, `NavLink and Hover Card`, `Carousel`, `Command Palette`, `Breadcrumb`, `Pagination`, `Sheet Components`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Brand and Icon Picker` be split into smaller, more focused modules?**
  _Cohesion score 0.06790890269151138 - nodes in this community are weakly interconnected._