import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-5 sm:p-6 lg:p-10 pt-16 lg:pt-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
