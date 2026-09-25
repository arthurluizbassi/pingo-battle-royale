# Arquitetura

Um único app **Next.js (App Router) + TypeScript**, com **Supabase** (Postgres + Auth) e **Phaser 3** só para o replay da arena. Não há microserviços, filas nem WebSockets.

```
src/
  engine/        MOTOR DE COMBATE — TypeScript puro (sem React, Next, Phaser, Supabase)
    rng.ts         PRNG com seed (única fonte de aleatoriedade)
    balance.ts     TODOS os números de combate
    stats.ts       base + modificadores → stats (com limites)
    battle.ts      simulateBattle(input, config) → { vencedor, eventos, estatísticas }
    power.ts       powerScore (só análise)
  content/items/ 90 itens como DADOS (stats, efeito, preço, tags, descrição)
  sprites/       pixel art como DADOS (grades de caracteres) + compositor de camadas
    data/base.ts   corpo do Pingo 40×40 (gerado por scripts/generate-base-sprite.ts)
    data/face.ts   olhos, bocas, detalhes (cosméticos grátis)
    items/         sprite de cada item, por categoria
    compose.ts     corpo → roupa → rosto → capacete → arma → mão (grid de cores)
  game/          replay visual
    timeline.ts    log de eventos → linha do tempo animada (puro, testado)
    ArenaScene.ts  cena Phaser (só desenha o que o log diz)
  lib/           funções puras compartilhadas (snapshot, ranking, resumo, rotação da loja)
  server/        código só-servidor ("server-only")
    auth.ts        sessão + checagem de role
    actions/       Server Actions (aluno, professor, login)
    battles.ts     LOCK (snapshot) e START (seed + simulação + gravação)
    shop.ts        rotação da loja (automática/lazy)
    catalog.ts     sincroniza o catálogo do código para a tabela items
  app/           páginas
    (game)/        interface do aluno (e Arena/Ranking para o professor no projetor)
    professor/     painel do professor
    dev/           páginas só de desenvolvimento (sprites, arena de demonstração)
supabase/migrations/  schema, RLS e funções SQL
scripts/              simulate, items:report, seed, create-teacher, db:migrate, db:check
```

## Fluxo de dados

```
Professor ──(Server Action, role checado)──► service role ──► funções SQL (grant_coins, lock/finish_battle…)
Aluno ──(Server Action)──► cliente com a sessão do aluno ──► buy_item / equip_item (SQL, usam auth.uid())
Páginas ──► leituras com a sessão do usuário ──► RLS decide o que é visível
```

### Por que o motor é separado
`simulateBattle` é uma função pura: recebe participantes (stats + efeitos), seed e config, e devolve o resultado com o log de eventos. Por isso ela roda do mesmo jeito:
- no servidor, quando o professor clica **START BATTLE**;
- em `npm run simulate`, milhares de vezes, sem navegador;
- nos testes (Vitest);
- na verificação de reprodutibilidade de batalhas antigas.

O Phaser **nunca calcula combate**. Ele lê os eventos salvos e anima. O ritmo da animação (`timeline.ts`) é separado do tempo do motor.

### Ciclo de vida de uma batalha
1. `create_battle`: status `scheduled`, numerada por turma, inscreve os alunos.
2. **LOCK LOADOUTS** (`lockBattle`): para cada participante grava um *snapshot* com nome, cosméticos, **cópia completa dos itens**, stats, efeitos e power score. Status passa a `locked`. O aluno pode trocar de equipamento depois, e isso não afeta o snapshot.
3. **START BATTLE** (`startBattle`): o servidor gera a seed (crypto), ordena os snapshots de forma estável, simula e chama `finish_battle`, que grava **numa única transação** o status `finished`, a seed, a versão do motor, a config de balanceamento, o resultado por aluno, os eventos e os troféus.
4. Replay: `/arena/[id]` lê os eventos (RLS: só batalhas finalizadas da turma) e reproduz. Nada é recalculado.

### Dinheiro (moedas virtuais)
- `wallet_transactions` é o livro-caixa. `wallets.balance` só muda dentro de funções SQL que também gravam o ledger.
- `CHECK (balance >= 0)` + `UPDATE … WHERE balance >= preço` garantem atomicidade e impedem saldo negativo, mesmo com cliques simultâneos.
- O `db:check` confere que saldo = soma do ledger em todas as carteiras.

### Autenticação
- O aluno digita **usuário + senha**. Por baixo, o usuário vira `usuario@alunos.pingo.local` no Supabase Auth, que guarda as senhas com hash.
- Só o servidor cria contas (Admin API com service role). O cadastro público fica desligado.
- `must_change_password` força a troca da senha temporária no primeiro acesso.

### Segurança (resumo)
- RLS em todas as tabelas. Os clientes só têm SELECT, com escopo da turma, e a carteira/ledger/inventário são visíveis só para o dono ou para o professor.
- Nenhuma policy de INSERT/UPDATE/DELETE para `anon`/`authenticated`, e os privilégios de escrita são revogados.
- As funções administrativas só podem ser executadas pela `service_role`. O aluno só executa `buy_item` e `equip_item`, que validam tudo com `auth.uid()`.
- Toda Server Action do professor chama `assertTeacher()` e confere se o aluno-alvo pertence à turma. Esconder botões não é a proteção.
- `SUPABASE_SERVICE_ROLE_KEY` só é lida em arquivos com `import "server-only"`. O build falha se um componente cliente importar esse código.

### Itens e sprites orientados a dados
- Adicionar um item = um objeto em `src/content/items/*.ts` + um sprite em `src/sprites/items/*.ts` com o mesmo `id`. Os testes garantem que todo item tem sprite e usa apenas stats e efeitos conhecidos.
- A tabela `items` é um espelho sincronizado automaticamente (hash em `app_meta`). Ela existe para as chaves estrangeiras e para que o preço usado na compra seja confiável.
- Sprites são grades de caracteres da paleta (`src/sprites/palette.ts`). Trocar a arte = editar a grade, sem mexer no código. `npm run sprites:export` gera SVGs e uma folha de contato para revisão.

### Decisões conscientes
- `items.id` é um *slug* (`wifi_hammer`), não UUID: o catálogo vive no código e o id precisa ser estável e legível. Todas as outras entidades usam UUID.
- Várias turmas: todas as tabelas têm `class_id` e as policies usam a turma do usuário. Hoje cada professor tem uma turma; dá para evoluir para professor↔turmas N:N sem mudar o motor.
- Sem IA no núcleo: resultados vêm exclusivamente do motor determinístico.
