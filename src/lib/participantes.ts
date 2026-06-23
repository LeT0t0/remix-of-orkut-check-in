import { supabase } from "@/integrations/supabase/client";

export interface Participante {
  codigo: string;
  nome: string;
  combo: string;
  presente: boolean;
  data_hora_checkin: string | null;
  realizado_por: string | null;
}

export async function fetchParticipantes(): Promise<Participante[]> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as Participante[];
}

export async function fetchParticipante(codigo: string): Promise<Participante | null> {
  const { data, error } = await supabase
    .from("participantes")
    .select("*")
    .eq("codigo", codigo)
    .maybeSingle();
  if (error) throw error;
  return (data as Participante) ?? null;
}

/**
 * Tenta confirmar presença de forma transacional.
 * Retorna { ok: true } se o operador atual conseguiu fazer o check-in,
 * { ok: false, alreadyCheckedIn: true } se já estava credenciado.
 */
export async function confirmarPresenca(codigo: string, userId: string) {
  const { data, error } = await supabase
    .from("participantes")
    .update({
      presente: true,
      data_hora_checkin: new Date().toISOString(),
      realizado_por: userId,
    })
    .eq("codigo", codigo)
    .eq("presente", false)
    .select("*");
  if (error) throw error;

  if (!data || data.length === 0) {
    return { ok: false as const };
  }
  // log histórico
  const { data: userData } = await supabase.auth.getUser();
  const nome = userData.user?.user_metadata?.nome || userData.user?.email || null;
  await supabase.from("historico").insert({
    codigo,
    acao: "CHECKIN",
    usuario_id: userId,
    usuario_nome: nome,
  });
  return { ok: true as const, participante: data[0] as Participante };
}

export async function cancelarPresenca(codigo: string, userId: string) {
  const { error } = await supabase
    .from("participantes")
    .update({ presente: false, data_hora_checkin: null, realizado_por: null })
    .eq("codigo", codigo);
  if (error) throw error;
  const { data: userData } = await supabase.auth.getUser();
  const nome = userData.user?.user_metadata?.nome || userData.user?.email || null;
  await supabase.from("historico").insert({
    codigo,
    acao: "CANCELAR",
    usuario_id: userId,
    usuario_nome: nome,
  });
}

export async function fetchOperadorNome(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("nome,email").eq("id", userId).maybeSingle();
  return data?.nome || data?.email || null;
}
