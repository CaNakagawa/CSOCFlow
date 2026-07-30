# CSOC Flow

**CSOC Flow** é uma aplicação web open source que ajuda analistas de SOC a construir investigações de segurança
visualmente. Funciona como um canvas investigativo (na linha de Miro/Maltego/Neo4j Bloom), mas voltado para o dia a
dia operacional de um SOC: você adiciona os fatos que encontrou (alertas, eventos de autenticação, processos,
IPs, hashes, técnicas MITRE ATT&CK...) e a aplicação correlaciona essas evidências, sugere hipóteses de ataque,
explica por que cada hipótese foi sugerida e recomenda os próximos passos da investigação.

A plataforma também é orientada a **casos de uso de detecção**: uma base de conhecimento de cenários conhecidos
(inspirados em regras de SIEM, como as analytics rules do Microsoft Sentinel) mapeia técnicas e táticas MITRE
ATT&CK para nomes de detecção reconhecíveis pelo analista. Ao adicionar técnicas ao canvas, a aplicação sugere
automaticamente os casos de uso compatíveis; ao aplicar um caso de uso, ela conecta as técnicas relacionadas e
apresenta um passo a passo de investigação — incluindo, quando disponível, links para MITRE ATT&CK Detection
Strategies que ajudam a validar cada etapa.

> ⚠️ **A aplicação auxilia o raciocínio investigativo, mas não confirma incidentes automaticamente.** As pontuações
> de compatibilidade são calculadas por um conjunto de regras determinísticas e pesos — não são uma classificação
> definitiva. A decisão final é sempre do analista.

O MVP funciona **inteiramente no navegador**, sem login e sem backend obrigatório, e pode ser hospedado no GitHub
Pages.

## Estado atual (fundação técnica)

Este repositório está na primeira etapa de implementação (Marco 1–3 do roadmap): fundação do projeto, canvas básico
e motor de correlação, com um único padrão investigativo completo (**SSH Brute Force**) para validar a arquitetura de
ponta a ponta. Relatório automático, linha do tempo completa e demais padrões investigativos (password spraying,
PowerShell suspeito, etc.) ainda não foram implementados — veja [Limitações](#limitações) e [Roadmap](#roadmap).

## Como executar

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. Clique em **"Carregar caso de demonstração"** na barra superior para ver o fluxo
completo (evidências → correlação → hipótese → verificações recomendadas) já preenchido.

## Como gerar o build

```bash
npm run build
npm run preview
```

O build é totalmente estático (`dist/`) e pode ser publicado em qualquer hospedagem de arquivos estáticos, incluindo
GitHub Pages (veja `.github/workflows/deploy.yml`).

## Scripts disponíveis

| Script                            | Descrição                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                     | Sobe o servidor de desenvolvimento (Vite).                                   |
| `npm run build`                   | Type-check + build de produção.                                              |
| `npm run typecheck`               | Apenas verificação de tipos.                                                 |
| `npm run lint`                    | ESLint sobre todo o projeto.                                                 |
| `npm run format` / `format:check` | Formata (ou verifica) o código com Prettier.                                 |
| `npm test`                        | Testes unitários (Vitest).                                                   |
| `npm run test:watch`              | Testes unitários em modo watch.                                              |
| `npm run test:e2e`                | Testes end-to-end (Playwright) — suíte inicial ainda a ser escrita.          |
| `npm run validate:knowledge`      | Valida todos os arquivos JSON da base de conhecimento contra os schemas.     |
| `npm run import:mitre`            | Reimporta o catálogo MITRE ATT&CK Enterprise (táticas, técnicas, analytics). |

## Arquitetura

O projeto é organizado por funcionalidade, não por tipo de arquivo:

```text
src/
  app/                 Composição da aplicação (layout, barra superior, painel lateral)
  shared/              Tipos e utilitários compartilhados entre features
  features/
    canvas/            Canvas visual (React Flow), biblioteca de elementos, nós customizados
    knowledge-base/    Carregador + validador (JSON Schema/Zod) da base de conhecimento — não depende de React
    correlation/       Motor de correlação puro (operadores, pontuação, explicações, inferência de relações)
    hypotheses/        Painel de hipóteses
    use-cases/         Painel e card de casos de uso de detecção (sugestão + passo a passo de investigação)
    investigation/     Estado da investigação (Zustand), repositório (Dexie/IndexedDB), casos de demonstração

public/data/           Base de conhecimento em JSON (técnicas MITRE, evidências, hipóteses, verificações,
                       casos de uso de detecção, relações automáticas) + JSON Schemas
scripts/               Scripts de build/CI (validação da base de conhecimento, importação do MITRE ATT&CK)
```

Camadas com responsabilidades isoladas:

- **Camada de conhecimento** (`features/knowledge-base`): carrega e valida os JSONs. Não conhece React.
- **Motor de correlação** (`features/correlation/engine`): avalia regras e produz hipóteses + relações automáticas.
  Não conhece componentes visuais, React Flow ou IndexedDB — é testado isoladamente (veja
  `CorrelationEngine.test.ts`).
- **Estado da investigação** (`features/investigation/store`): nós, relações, respostas de verificação e
  resultados de hipóteses, via Zustand.
- **Persistência** (`features/investigation/repository`): abstração `InvestigationRepository` sobre IndexedDB
  (Dexie) — os componentes visuais nunca acessam o IndexedDB diretamente.

## Base de conhecimento em duas camadas

A biblioteca cobre o catálogo MITRE ATT&CK Enterprise completo (todas as táticas, técnicas e subtécnicas), em duas
camadas com propósitos diferentes:

- **Camada curada** — um arquivo por técnica em `public/data/mitre/techniques/T*.json`, escrito à mão. Traz o
  conteúdo didático próprio do CSOC Flow (`investigation_context`: o que significa, por que importa, quando é
  suspeito, quando é legítimo, erros comuns de interpretação) e tradução completa em inglês, português e alemão.
- **Camada importada** — `public/data/mitre/techniques/attack-catalog.json`, gerado por `npm run import:mitre` a
  partir do bundle STIX oficial do MITRE. Traz nome, táticas, plataformas, o resumo original e as Detection
  Analytics reais (`AN####` sob suas `DET####`), em inglês.

Regras que sustentam esse modelo:

- **A curadoria sempre vence.** Os arquivos curados vêm antes do catálogo no `manifest.json` e o carregador
  deduplica por `id`, então a reimportação nunca sobrescreve conteúdo escrito à mão.
- **`investigation_context` é opcional.** Técnicas importadas simplesmente não exibem essas seções, em vez de
  mostrar conteúdo inventado.
- **`pt` e `de` são opcionais; `en` é obrigatório.** `localize()` cai para o inglês quando falta tradução, de modo
  que orientação de segurança nunca é traduzida por máquina.

Para promover uma técnica importada à camada curada, crie `T####.json` com o conteúdo didático e traduções,
adicione-o ao `manifest.json` antes do catálogo e rode `npm run import:mitre` novamente — ela sairá do catálogo
gerado automaticamente.

## Como criar conteúdo (técnicas, evidências, hipóteses)

Toda a base de conhecimento vive em `public/data/` como JSON puro (nunca código executável) e é referenciada por
`public/data/manifest.json`. Para adicionar conteúdo:

1. Crie o arquivo JSON seguindo um dos schemas em `public/data/schemas/` (`technique.schema.json`,
   `evidence.schema.json`, `hypothesis.schema.json`, `check.schema.json`, `use-case.schema.json`).
2. Referencie o novo arquivo em `manifest.json`.
3. Rode `npm run validate:knowledge` para confirmar que o arquivo é válido — um arquivo inválido nunca falha
   silenciosamente: o erro aponta o arquivo, o campo e o motivo.

Nenhuma mudança de código é necessária para ampliar a base de conhecimento.

## Limitações

- Apenas dois casos de uso de detecção estão completos ("Autenticação suspeita" e "User Account Created/Deleted");
  os demais cenários descritos na especificação original ainda não foram implementados.
- Das 697 técnicas do catálogo, 18 têm conteúdo didático curado e tradução completa; as demais trazem apenas os
  dados oficiais do MITRE, em inglês.
- Não há geração de relatório em Markdown, linha do tempo visual completa, desfazer/refazer, nem testes end-to-end
  ainda.
- O layout prioriza uso em desktop.

## Roadmap

Veja a especificação técnica original do projeto para o roadmap completo (Fases 2–4: padrões customizados pela
interface, integrações com SIEM/EDR, colaboração em time, etc.). Os próximos marcos deste repositório são: relatório
automático + linha do tempo (Marco 5) e testes end-to-end + acessibilidade + demais casos de demonstração (Marco 6).

## Licença

[MIT](LICENSE).
