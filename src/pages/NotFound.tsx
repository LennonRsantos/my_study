import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { linkClass } from "@/components/page/styles";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-sm">
        <p className="font-display text-6xl font-semibold tracking-tight text-muted-foreground/40" aria-hidden>
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{location.pathname}</code> não existe no MetaStudy.
        </p>
        <Link to="/" className={`${linkClass} mt-6 inline-block`}>
          Voltar ao início
        </Link>
      </div>
    </main>
  );
};

export default NotFound;
