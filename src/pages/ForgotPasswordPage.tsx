import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/page/AuthShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    const { error } = await resetPassword(email);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <AuthShell
      title={sent ? "Confira seu email" : "Recuperar senha"}
      description={
        sent ? (
          <>Enviamos um link para <strong className="font-medium text-foreground">{email}</strong>. Abra-o para criar uma senha nova.</>
        ) : (
          "Informe o email da conta. Enviaremos um link para criar uma senha nova."
        )
      }
      footer={<Link to="/login" className="rounded font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Voltar para o login</Link>}
    >
      {!sent && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input id="forgot-email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
