export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const DB_ERRORS: Record<string, string> = {
  insufficient_funds: "Saldo insuficiente.",
  already_owned: "Você já tem esse item.",
  item_not_in_shop: "Esse item não está na loja agora.",
  item_not_found: "Item não encontrado.",
  not_owned: "Você não tem esse item.",
  wrong_slot: "Esse item não serve nesse espaço.",
  not_allowed: "Ação não permitida.",
  not_authenticated: "Faça login novamente.",
  battle_not_scheduled: "Os loadouts já foram travados.",
  battle_not_locked: "Trave os loadouts antes de iniciar.",
  zero_amount: "A quantidade não pode ser zero.",
  too_fast: "Calma! Espere alguns segundos entre um duelo e outro.",
  no_opponent: "Ainda não há colegas na turma para duelar.",
  no_points: "Você não tem pontos para distribuir.",
  stat_capped: "Esse atributo já está no máximo.",
};

export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Erro inesperado.";
  for (const [code, text] of Object.entries(DB_ERRORS)) if (message.includes(code)) return text;
  return message;
}

export async function runAction(fn: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await fn();
    return { ok: true, message: message ?? undefined };
  } catch (error) {
    // Next.js redirects are thrown as errors and must propagate
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    return { ok: false, error: friendlyError(error) };
  }
}
