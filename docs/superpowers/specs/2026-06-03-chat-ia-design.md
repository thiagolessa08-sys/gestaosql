# Chat IA — Assistente com Acesso ao Banco

**Data:** 2026-06-03
**Status:** Aprovado

## Objetivo

Página `/chat` exclusiva para Admin Total com um assistente de IA (Claude Opus 4.8) que responde perguntas sobre os dados do sistema usando tool use para consultar o banco em tempo real.

## Acesso

Somente `isSystemAdmin`. Middleware já protege via `/chat*` → redirect se não for admin total.

## Arquitetura — Tool Use + Streaming

```
Browser → POST /api/chat (streaming) → Claude Opus 4.8
                                          ↓ tool_use
                                        executa tools no servidor (Prisma)
                                          ↓ tool_result
                                        Claude gera resposta
                                          ↓ streaming SSE
                                        Browser exibe em tempo real
```

## Tools disponíveis para o Claude

| Tool | Descrição | Parâmetros |
|---|---|---|
| `buscar_oportunidades` | Pipeline comercial | etapa?, responsavel?, limite? |
| `buscar_projetos` | Projetos com métricas | arquivados? |
| `buscar_cards` | Cards de sprints | projetoSlug?, status?, limite? |
| `buscar_usuarios` | Usuários e perfis | perfil? |
| `resumo_dashboard` | KPIs consolidados | — |

## API Route — `src/app/api/chat/route.ts`

- `POST` recebe `{ messages: {role, content}[] }`
- Valida sessão (isSystemAdmin)
- Instancia `Anthropic` com `ANTHROPIC_API_KEY`
- Chama `client.messages.stream()` com `claude-opus-4-8`, `thinking: {type: "adaptive"}`, tools definidas
- Loop de tool use: ao receber `tool_use`, executa a tool via Prisma, adiciona `tool_result`, continua streaming
- Retorna `ReadableStream` (SSE) com os chunks de texto

## Página — `src/app/(app)/chat/page.tsx`

Client component com:
- Header: "Chat IA" + botão limpar conversa
- Área de mensagens (scroll) com bolhas user/assistant
- Indicador de "digitando..." durante streaming
- Input + botão enviar (Enter também envia)
- Sugestões de perguntas iniciais clicáveis

## Dependências

- `@anthropic-ai/sdk` — instalar
- `ANTHROPIC_API_KEY` — adicionar ao `.env` e Railway

## System prompt do Claude

Contexto sobre o sistema: SQLTech Gestão, módulos Projetos e Comercial, estrutura dos dados. Instrui o Claude a usar português, ser conciso e usar as tools quando precisar de dados específicos.

## Fora de escopo (v1)

- Histórico de conversas persistido no banco
- Chat por perfil (Comercial vê só comercial) — v1 é só admin total
- Upload de arquivos
