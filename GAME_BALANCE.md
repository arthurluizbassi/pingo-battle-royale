# GAME_BALANCE — Pingo Battle Royale

> **Regra de ouro:** fazer mais atividades deve **aumentar a chance** de vencer, **nunca garantir** a vitória.

Todos os números de combate ficam em [`src/engine/balance.ts`](src/engine/balance.ts). Preços, recompensas e ranking ficam em [`src/config/game.ts`](src/config/game.ts). Os itens estão em [`src/content/items/`](src/content/items). Nenhuma outra parte do código tem constantes de balanceamento.

Depois de mudar qualquer valor:

```bash
npm run simulate          # cenários + turma realista (≈ 1 min)
npm run items:report      # força de cada item sozinho
npm test                  # inclui testes estatísticos de direção
```

---

## 1. Atributos base (todo Pingo começa igual)

| Atributo | Base | Limites | O que faz |
|---|---|---|---|
| HP | 100 | 50–200 | vida |
| ATK | 40 | 15–80 | dano bruto |
| DEF | 10 | 0–45 | reduz dano (fórmula abaixo) |
| VEL | 20 | 8–40 | frequência de ataques |
| CRIT | 15% | 0–40% | chance de crítico |
| ESQ | 12% | 0–30% | chance de desviar totalmente |

A cosmética (cor, olhos, boca, detalhe) **nunca** altera atributos.

## 2. Fórmula de dano

```
dano = ATK × K / (K + DEF_do_alvo) × variação
K = 50            → DEF 10 reduz ~17%, DEF 30 reduz ~37%
variação = 0,65 a 1,35 (uniforme)     | com efeito "caos": 1 ± valor
crítico: × 2,5  (o extra é reduzido pelo "anti-crítico" do alvo)
bloqueio: −60% no golpe (chance vem de itens)
mínimo de 1 de dano
```

Um Pingo pelado bate ~33 por golpe, então leva **~3 golpes para cair**. Isso é proposital: lutas curtas têm variância suficiente para gerar zebras. Um crítico (~83) quase derruba sozinho, e é daí que vem o "tomou um crítico absurdo e perdeu".

## 3. Velocidade (barra de iniciativa)

A cada *tick*, cada Pingo soma sua VEL numa barra. Quando ela chega a 200, ele ataca e a barra desconta 200. VEL 20 ataca a cada 10 ticks; VEL 24 ataca 20% mais vezes. A barra começa com um valor aleatório (0–120), então nem sempre o mais rápido ataca primeiro.

## 4. Esquiva, crítico e limites

- A esquiva é testada primeiro. Se ela acontece, o golpe causa 0 de dano.
- Crítico e esquiva têm teto (40% e 30%), para impedir builds "intocáveis".
- Efeitos iguais vindos de itens diferentes se somam, até um teto (`effects.max`).

## 5. Efeitos especiais (lista completa, 7)

| Efeito | Descrição |
|---|---|
| `firstStrike` | primeiro ataque da batalha causa +X% |
| `openingGuard` | primeiro golpe recebido causa −X% |
| `adrenaline` | +X VEL quando o HP fica abaixo de 35% |
| `block` | X% de chance de reduzir um golpe em 60% |
| `chaos` | dano varia entre (1−X) e (1+X). A média não muda, só a variância. **Bom para azarões, ruim para favoritos.** |
| `critDamage` | críticos causam +X de multiplicador |
| `critShield` | críticos recebidos têm o extra reduzido em X% |

Não existem veneno, mana, stamina nem árvore de habilidades, de propósito.

## 6. Battle Royale

- **Escolha de alvo:** o peso vem de `1 / (0,15 + distância)`. O alvo **sofre penalidade** se levou muitos golpes recentes de *outros* Pingos (anti "todo mundo bate no favorito no primeiro segundo"). Existe bônus para revidar e para continuar no mesmo alvo, o que gera "duelos" naturais dentro da arena.
- **Sudden death:** a partir do tick 150, a zona causa dano verdadeiro crescente a cada 10 ticks (5%, 8%, 11%… do HP máximo). O último sobrevivente nunca morre pela zona. Nas simulações atuais, o sudden death quase nunca acontece; ele é uma rede de segurança para builds extremamente defensivas.
- Um royale de 20 Pingos tem ~70 ataques e ~114 eventos.

## 7. Filosofia dos itens (sidegrades, não upgrades lineares)

- **Máximo de 3 equipamentos** (arma, capacete, roupa). Isso limita o poder de quem tem muitas moedas: a partir de ~900 PC, mais dinheiro compra **opções**, não mais força.
- Todo item acima do básico tem **trade-off**. Exemplos: as armas pesadas perdem VEL (teste automático: ATK > +10 exige VEL negativa), e as armas rápidas perdem ATK.
- Arquétipos: armas equilibradas, pesadas, rápidas, de crítico, defensivas e caóticas; capacetes de defesa, HP, anti-crítico, velocidade e híbridos; roupas de HP, mobilidade, defesa, esquiva e híbridas. Há contra-jogo: a build de crítico perde para a anti-crítico, e a pesada pode perder para esquiva/velocidade dependendo dos números.

### Faixas de preço (`GAME.priceByTier`)

| Tier | Preço | Força média sozinho (vs pelado) |
|---|---|---|
| ★ | 80 | ~55% |
| ★★ | 150 | ~58% |
| ★★★ | 240 | ~60% |
| ★★★★ | 360 | ~62% |

Um tier maior é **um pouco** mais forte e bem mais interessante (efeitos especiais, trade-offs maiores). Com uma recompensa padrão de 100 PC por atividade, 3–4 atividades compram um item ★★★.

## 8. Objetivos de win rate (e onde estamos)

Resultados de `npm run simulate` (10 000 duelos por cenário):

| Cenário | Meta | Atual |
|---|---|---|
| pelado × pelado | ~50% | 50,0% |
| build média (3× ★★) × pelado | vantagem clara | 71% |
| **build forte × pelado** | **70–80%** | **mediana 79%** (faixa 71–85% em 100 builds ★★★/★★★★) |
| forte × média | leve vantagem | 62% |
| duas builds semelhantes | ~50% | 48/52 |
| tank × glass cannon | nenhum lado > 65% | 41/59 |
| crit × anti-crit | contra-jogo | 38/62 |
| turma realista (20 Pingos) | ricos > pobres, sem garantia | 5 mais ricos 6,7% · 5 mais pobres 2,8% · uniforme 5% |

**Sinais de alarme:**
- build forte vencendo pelado em **>90%**: RNG baixo demais. Aumente a variância ou o crítico, ou reduza o HP base.
- build forte **<65%**: itens irrelevantes. Faça o contrário.
- um item isolado com win rate muito acima dos outros do mesmo tier (`npm run items:report`) → nerf.

## 9. Power score

`powerScore = 100 × √(EHP × DPS)` normalizado (pelado = 100), onde EHP considera HP, DEF, esquiva, bloqueio e anti-crítico, e DPS considera ATK, VEL, crítico e efeitos. Serve **apenas para análise**: comparar builds, achar outliers e mostrar ao professor depois da batalha. Ele **nunca** decide um resultado e não aparece para os alunos.

## 10. Economia e anti-snowball

- Moedas só entram pela mão do professor (atividades e prêmios especiais). Toda mudança fica registrada no ledger.
- Vencer **não dá moedas**. Dá pontos de temporada, troféus e badges (cosméticos). O campeão da semana não fica mais forte na semana seguinte.
- Ranking de temporada: 10/7/5/4/3 pontos para os 5 primeiros, 1 para os demais, +1 por eliminação (`GAME.season`).
- Não existe dinheiro real, aposta, loot box nem troca entre alunos.

## 11. Reprodutibilidade

Toda aleatoriedade vem de um único PRNG com seed (`mulberry32`, `src/engine/rng.ts`). Uma batalha guarda: seed, versão do motor, **cópia completa da config de balanceamento**, e snapshot dos participantes (itens copiados, stats e efeitos). O botão "Verificar reprodutibilidade" do professor re-simula e compara com o log salvo. Mudar o `balance.ts` depois **não altera** batalhas antigas.
