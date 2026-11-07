# Pingo Battle Royale 🥊💧

Jogo educacional competitivo: cada aluno tem um **Pingo**. O professor dá **PingoCoins** pelas atividades, os alunos compram equipamentos e, no sábado, todos os Pingos entram num **Battle Royale**. O último de pé vence.

> atividade → moedas → escolha → item → build → expectativa → batalha → surpresa → história → próxima semana

- 90 itens em pixel art (30 armas, 30 capacetes, 30 roupas), com *trade-offs* em vez de upgrades lineares
- motor de combate determinístico (seed), separado da interface e testado
- replay da batalha em Phaser, com controles para o projetor
- painel do professor: alunos, moedas em lote, loja rotativa, temporadas, batalhas e estatísticas
- sem dinheiro real, sem apostas, sem loot boxes

Documentos: [ARCHITECTURE.md](ARCHITECTURE.md) · [GAME_BALANCE.md](GAME_BALANCE.md)

---

## 1. Requisitos

- **Node.js 20+** (testado com 24 LTS)
- Um projeto **Supabase**: cloud gratuito (recomendado) ou local via Docker

## 2. Instalação

```bash
npm install
cp .env.example .env.local   # no Windows: copy .env.example .env.local
```

## 3. Configurar o Supabase (cloud)

1. Crie um projeto em [supabase.com](https://supabase.com). A região **South America (São Paulo)** é a recomendada. Guarde a senha do banco.
2. Preencha o `.env.local`:

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave `anon` / *publishable* |
| `SUPABASE_SERVICE_ROLE_KEY` | chave `service_role` / *secret*. **Só servidor. Nunca use o prefixo `NEXT_PUBLIC_`** |
| `SUPABASE_DB_URL` | botão **Connect** → *Session pooler* → URI (com a senha do banco) |

3. Em **Authentication → Sign In / Providers**, desative **"Allow new users to sign up"**. Só o professor cria contas.

> Supabase local (opcional): com Docker e virtualização habilitados, rode `npm run db:local:start`, use os valores que o CLI mostrar e `SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## 4. Migrations

```bash
npm run db:migrate
```

Aplica `supabase/migrations/*.sql` em ordem (schema, RLS e funções) e registra o que já foi aplicado. Pode rodar de novo sem problema.

## 5. Dados de demonstração (seed)

```bash
npm run seed
```

Cria a **Turma Demo** com 1 professor, 12 alunos com Pingos, moedas variadas vindas de "atividades", itens comprados e equipados, uma temporada, a loja, um Royale já disputado (com replay) e outro agendado.

As senhas vêm de `SEED_DEFAULT_PASSWORD` (se definida) ou são geradas. Elas ficam **apenas** em `.seed-credentials.local.txt`, que é ignorado pelo git. Não use contas de seed em produção.

Depois do seed, rode a verificação de segurança:

```bash
npm run db:check
```

Ela testa RLS, compra atômica, saldo nunca negativo, bloqueio de endpoints administrativos para alunos e ledger = saldo. O teste roda dentro de uma transação desfeita no final, então nada é salvo.

## 6. Rodar

```bash
npm run dev    # http://localhost:3000
```

- Entre como `professor` (senha no arquivo de credenciais) → painel em `/professor`.
- Entre como um aluno (ex.: `ana`) → `/pingo`.
- Páginas de desenvolvimento (sem login): `/dev/sprites` (os 90 itens) e `/dev/arena?seed=27&n=20` (batalha de demonstração).

**Problemas comuns**
- `npm` não reconhecido no PowerShell: feche e abra o terminal (o Node foi instalado depois que ele foi aberto).
- "missing required error components, refreshing…" ou erro `ENOENT … .next`: o cache do Next corrompeu (acontece se `npm run build` rodar com o `dev` ligado). Pare o servidor (Ctrl+C), rode `npm run clean` e depois `npm run dev`.

## 7. Criar o professor (produção)

```bash
npm run create-teacher -- --username prof.ana --name "Prof. Ana" --class "7º Ano B"
```

Imprime uma senha temporária uma única vez, e a troca é obrigatória no primeiro acesso. Os alunos são criados pelo próprio professor no painel (**Alunos → Novo aluno**), que mostra a senha temporária de cada um.

## 8. Simulações de balanceamento

```bash
npm run simulate                        # todos os cenários + turma realista
npm run simulate -- --n 2000            # mais rápido
npm run simulate -- --a tank --b glass  # um confronto específico (builds em scripts/simulate.ts)
npm run items:report                    # força de cada item isolado
```

Veja [GAME_BALANCE.md](GAME_BALANCE.md) para interpretar os números e saber o que ajustar.

## 9. Testes e qualidade

```bash
npm test           # motor, itens, sprites, timeline do replay, ranking, loja
npm run typecheck
npm run lint
```

## 10. Deploy (Vercel + Supabase)

1. Suba o repositório no GitHub e importe na [Vercel](https://vercel.com).
2. Em *Environment Variables*, configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. O `SUPABASE_DB_URL` não é necessário em runtime.
3. No seu computador, com o `.env.local` apontando para o projeto de produção: `npm run db:migrate` e `npm run create-teacher -- ...`.
4. Em Supabase → Authentication → URL Configuration, coloque a URL da Vercel em *Site URL*.

O catálogo de itens é sincronizado automaticamente com o banco na primeira visita ao painel ou à loja.

## 11. Uso em aula (roteiro)

1. **Durante a semana:** Professor → Moedas → "Atividade 04", 100 PC, marque quem entregou → Distribuir.
2. **Alunos:** Loja → comprar → Inventário → equipar e testar builds.
3. **Sábado:** Professor → Battle Royales → a batalha → **LOCK LOADOUTS** → **START BATTLE**.
4. **Projetor:** Arena → a batalha → ⛶ Tela cheia. Todos podem assistir ao mesmo replay nos próprios aparelhos.
5. **Depois:** Resultado (estatísticas + power score para o professor) e Ranking da temporada.

O prêmio físico (chocolate, etc.) é só um texto informativo no evento. A plataforma não gerencia prêmios.

## Scripts

| Script | O que faz |
|---|---|
| `dev` / `build` / `start` | Next.js |
| `test`, `typecheck`, `lint` | qualidade |
| `simulate`, `items:report` | balanceamento |
| `db:migrate`, `db:check` | banco (Postgres via `SUPABASE_DB_URL`) |
| `seed`, `create-teacher` | dados |
| `sprites:export`, `sprites:base` | assets pixel art |

## Créditos

- Ícones da interface: pixel art 16×16 em `src/sprites/icons.ts` (prévia: `npx tsx scripts/icons-preview.ts`).
  Seis deles (escudo, olá, ajuste, alfinete, susto, esquiva) foram derivados do
  [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) © Microsoft, licença MIT — ver `licenses/fluentui-emoji.txt`.

## Licença

© 2026 Arthur Luiz Bassi. **Todos os direitos reservados.** O código está público só para visualização e avaliação; copiar, hospedar ou reutilizar o jogo, os personagens ou a arte exige autorização por escrito. Ver [LICENSE](LICENSE).
