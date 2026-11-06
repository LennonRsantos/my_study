import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/page/PageHeader";
import StatRow from "@/components/page/StatRow";
import { LoadingState } from "@/components/page/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  user_type: string | null;
  created_at: string;
  sessionCount?: number;
  subjectCount?: number;
  courseCount?: number;
  isAdmin?: boolean;
}

interface EditForm {
  full_name: string;
  display_name: string;
  date_of_birth: string;
  user_type: string;
}

export default function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<EditForm>({
    full_name: "",
    display_name: "",
    date_of_birth: "",
    user_type: "aluno",
  });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) loadProfiles();
  }, [isAdmin]);

  const loadProfiles = async () => {
    setLoadingData(true);
    try {
      const [{ data: profilesData }, { data: rolesData }, { data: sessionsData }, { data: subjectsData }, { data: coursesData }] =
        await Promise.all([
          supabase.from("profiles").select("*"),
          supabase.from("user_roles").select("*"),
          supabase.from("study_sessions").select("user_id"),
          supabase.from("subjects").select("user_id"),
          supabase.from("courses").select("user_id"),
        ]);

      const mapped = (profilesData || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        full_name: p.full_name,
        date_of_birth: p.date_of_birth,
        user_type: p.user_type,
        created_at: p.created_at,
        sessionCount: (sessionsData || []).filter((s: any) => s.user_id === p.user_id).length,
        subjectCount: (subjectsData || []).filter((s: any) => s.user_id === p.user_id).length,
        courseCount: (coursesData || []).filter((c: any) => c.user_id === p.user_id).length,
        isAdmin: (rolesData || []).some((r: any) => r.user_id === p.user_id && r.role === "admin"),
      }));
      setProfiles(mapped);
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const openEdit = (p: UserProfile) => {
    setForm({
      full_name: p.full_name || "",
      display_name: p.display_name || "",
      date_of_birth: p.date_of_birth || "",
      user_type: p.user_type || "aluno",
    });
    setEditing(p);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          display_name: form.display_name || null,
          date_of_birth: form.date_of_birth || null,
          user_type: form.user_type,
        })
        .eq("user_id", editing.user_id);
      if (error) throw error;
      toast({ title: "Usuário salvo" });
      setEditing(null);
      await loadProfiles();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setRemovingId(deleting.user_id);
    try {
      const { error } = await supabase.from("profiles").delete().eq("user_id", deleting.user_id);
      if (error) throw error;
      toast({ title: "Usuário excluído" });
      setDeleting(null);
      await loadProfiles();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totalCourses = profiles.reduce((a, p) => a + (p.courseCount || 0), 0);

  return (
    <AppLayout>
      <PageHeader title="Painel admin" description="Usuários cadastrados e o volume de dados de cada um." />

      <div className="space-y-6">
        <StatRow
          stats={[
            { label: "Usuários", value: String(profiles.length) },
            { label: "Sessões", value: String(profiles.reduce((a, p) => a + (p.sessionCount || 0), 0)) },
            { label: "Matérias", value: String(profiles.reduce((a, p) => a + (p.subjectCount || 0), 0)) },
            { label: "Cursos", value: String(totalCourses) },
          ]}
        />

        <section aria-labelledby="admin-users" className="rounded-xl border bg-card">
          <h2 id="admin-users" className="px-5 pt-5 text-base font-semibold sm:px-6">Usuários</h2>
          <div className="p-5 sm:p-6">
            {loadingData ? (
              <LoadingState />
            ) : (
              <>
                {/* Mobile cards */}
                <ul className="grid gap-3 md:hidden">
                  {profiles.map((p) => (
                    <li key={p.user_id} className="space-y-3 rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{p.full_name || p.display_name || "—"}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant={p.user_type === "professor" ? "default" : "secondary"}>
                                {p.user_type === "professor" ? "Professor" : "Aluno"}
                              </Badge>
                              {p.isAdmin && <Badge variant="outline">Admin</Badge>}
                            </div>
                          </div>
                        </div>
                        <dl className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-md bg-muted/50 p-2">
                            <dt className="text-muted-foreground">Cursos</dt>
                            <dd className="font-display text-base font-semibold tabular-nums">{p.courseCount}</dd>
                          </div>
                          <div className="rounded-md bg-muted/50 p-2">
                            <dt className="text-muted-foreground">Matérias</dt>
                            <dd className="font-display text-base font-semibold tabular-nums">{p.subjectCount}</dd>
                          </div>
                          <div className="rounded-md bg-muted/50 p-2">
                            <dt className="text-muted-foreground">Sessões</dt>
                            <dd className="font-display text-base font-semibold tabular-nums">{p.sessionCount}</dd>
                          </div>
                        </dl>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                            <Pencil className="w-3.5 h-3.5" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive hover:text-destructive"
                            onClick={() => setDeleting(p)}
                            disabled={p.user_id === user?.id}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                          </Button>
                        </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nascimento</TableHead>
                        <TableHead className="text-center">Cursos</TableHead>
                        <TableHead className="text-center">Matérias</TableHead>
                        <TableHead className="text-center">Sessões</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Acesso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((p) => (
                        <TableRow key={p.user_id}>
                          <TableCell className="font-medium">{p.full_name || p.display_name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={p.user_type === "professor" ? "default" : "secondary"}>
                              {p.user_type === "professor" ? "Professor" : "Aluno"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.date_of_birth ? new Date(p.date_of_birth + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{p.courseCount}</TableCell>
                          <TableCell className="text-center tabular-nums">{p.subjectCount}</TableCell>
                          <TableCell className="text-center tabular-nums">{p.sessionCount}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {p.isAdmin ? (
                              <Badge variant="outline">Admin</Badge>
                            ) : (
                              <Badge variant="secondary">Usuário</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(p)} aria-label={`Editar ${p.full_name || p.display_name || "usuário"}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(p)}
                                disabled={p.user_id === user?.id}
                                aria-label={p.user_id === user?.id ? "Você não pode excluir a própria conta" : `Excluir ${p.full_name || p.display_name || "usuário"}`}
                                title={p.user_id === user?.id ? "Você não pode excluir a própria conta" : undefined}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Atualize os dados cadastrais do usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de exibição</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Data de nascimento</Label>
              <Input
                id="dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_type">Tipo de usuário</Label>
              <Select value={form.user_type} onValueChange={(v) => setForm({ ...form, user_type: v })}>
                <SelectTrigger id="user_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aluno">Aluno</SelectItem>
                  <SelectItem value="professor">Professor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O perfil de <strong className="font-medium text-foreground">{deleting?.full_name || deleting?.display_name || "—"}</strong> e
              todos os dados dele (cursos, matérias, sessões) serão excluídos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!removingId}
            >
              {removingId && <Loader2 className="w-4 h-4 animate-spin" />}
              Excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
