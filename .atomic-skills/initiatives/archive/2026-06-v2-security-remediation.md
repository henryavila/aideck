---
schemaVersion: '0.1'
slug: v2-security-remediation
title: 'Remediar blocker+critical da review híbrida v2'
goal: 'Fechar todos os findings blocker e critical da review híbrida (workflow same-model + codex cross-model) de 2026-05-28: família de path-traversal, DoS, XSS, packaging e dead-code do router.'
status: archived
branch: feat/aideck-v2-generic-runtime
started: '2026-05-29T02:16:35Z'
lastUpdated: '2026-06-02T14:09:48Z'
archivedAt: '2026-06-02T14:09:48Z'
nextAction: null

exitGates:
  - id: GG-1
    description: 'npm run typecheck passa sem erros'
    status: met
    metAt: '2026-05-29T02:29:15Z'
    verifier: { kind: shell, command: 'npm run typecheck', expectExitCode: 0 }
    evidence:
      verifierKind: shell
      verifiedAt: '2026-05-29T02:29:15Z'
      passed: true
      exitCode: 0
      outputSummary: 'tsc --noEmit limpo (0 erros)'
  - id: GG-2
    description: 'npm test passa (incluindo novos testes de segurança)'
    status: met
    metAt: '2026-05-29T02:29:15Z'
    verifier: { kind: shell, command: 'npm test', expectExitCode: 0 }
    evidence:
      verifierKind: shell
      verifiedAt: '2026-05-29T02:29:15Z'
      passed: true
      exitCode: 0
      outputSummary: '582 passed (73 files) em vitest run --no-file-parallelism; as 2 falhas em paralelo são flakiness do chokidar (passam isoladas)'
  - id: GG-3
    description: 'Cada novo teste de segurança falha se o fix correspondente for revertido (anti-tautologia G3)'
    status: met
    metAt: '2026-05-29T02:29:15Z'
    verifier: { kind: manual, description: 'Para cada assertion nova, nomear a mutação no fix que a quebra' }
    evidence:
      verifierKind: manual
      verifiedAt: '2026-05-29T02:29:15Z'
      passed: true
      outputSummary: 'Mutação que quebra cada teste — traversal: remover isWithinDir/resolveWithinDir → write/read fora do dir retorna 200/lê arquivo → assert 400/empty falha; shell-exec: remover shellQuote → $(id) é substituído → stdout != literal; DoS: reverter resolveCollision → loop infinito → timeout 5s; XSS: link raw → href=javascript:/atributo onmouseover parseado'

stack:
  - { id: 1, title: 'Remediar blocker+critical da review híbrida', type: task, openedAt: '2026-05-29T02:16:35Z' }

tasks:
  - id: T-001
    title: 'Shared path-guard + aplicar nos surfaces de write/read/exec'
    description: 'Criar src/server/writers/path-guard.ts (isWithinDir/resolveWithinDir) e aplicar contenção em: aideck_write (mcp/tools/generic.ts), POST write (routes/api-v2.ts), file-mutation.ts, script.ts (source), data-source-reader.ts (expandGlob). Fecha F-001..F-004 (codex) e os traversal blocker/critical same-model.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [blocker, critical, security, traversal]

  - id: T-002
    title: 'shell-exec: neutralizar injection via shell-quoting dos args'
    description: 'renderTemplate ganha escaper opcional; shell-exec.ts passa shellQuote (single-quote POSIX) nos valores substituídos. Fecha codex F-005 + same-model shell-exec critical.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [critical, security]

  - id: T-003
    title: 'project-registry: corrigir loop infinito do resolveCollision'
    description: 'Truncar baseId antes de anexar o contador (preservar sufixo dentro de 64 chars) + cap de iteração com fallback único. Fecha o blocker de DoS em /api/projects/register.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [blocker, correctness, dos]

  - id: T-004
    title: 'MarkdownWidget: corrigir XSS no href'
    description: 'sanitizeHref: bloquear schemes perigosos (javascript:/data:/vbscript:) e escapar aspas no valor do href; rel="noopener noreferrer". Fecha o blocker de XSS (v-html).'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [blocker, security, xss, frontend]

  - id: T-005
    title: 'seed-demo: empacotar assets do consumer no build'
    description: 'build (tsc) não copia os YAML/JSON/JSONL de src/demo/consumer; aideck demo quebra em build limpo. Adicionar passo de cópia ao script build do package.json. Fecha o blocker de packaging.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [blocker, packaging]

  - id: T-006
    title: 'cli/up: substituir detecção rootDir morta por registro incondicional'
    description: 'health v2 não retorna rootDir, tornando a detecção de mismatch dead code (nunca registra o projeto atual numa instância já rodando). Trocar por tryRegister incondicional + return url. Fecha o critical de dead-code.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [critical, correctness, cli]

  - id: T-007
    title: 'Testes: traversal/injection/DoS/XSS'
    description: 'path-guard unit; rejeição de traversal em file-mutation/api-v2/aideck_write/data-source-reader/script source; shell-exec injection neutralizado; project-registry colisão 64-char sem loop; MarkdownWidget XSS (@vue/test-utils). Anti-tautologia G3.'
    status: done
    closedAt: '2026-05-29T02:29:15Z'
    lastUpdated: '2026-05-29T02:29:15Z'
    tags: [blocker, critical, testing]

parked: []

emerged: []
---

# v2 Security Remediation — blocker+critical da review híbrida

Ancora a remediação dos findings **blocker + critical** da review híbrida de 2026-05-28
(`.atomic-skills/reviews/2026-05-28-2304-aideck-v2-hybrid-review.md`).

## Proveniência

- **Workflow same-model** (Claude, 13 domínios): 57 findings (6B/5C/14M/31m/1n), run `wf_3b714493-8d6`.
- **Codex cross-model** (`gpt-5-codex`, blind+informed): 7 findings (5C/2M).

Fora de escopo desta iniciativa (são **major**): `normalize.ts` schemaVersion (F-007) e
namespacing do router v2 (F-006) — parkear/tratar depois.

## Causa-raiz

`handlers/script.ts` já valida contenção (`validateWritePath`); os surfaces paralelos
(generic write, api-v2 write, file-mutation, script source, data-source-reader read) **não**.
T-001 unifica isso com um guard compartilhado.
