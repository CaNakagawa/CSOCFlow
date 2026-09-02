# CSOC Flow

**Construa casos de uso de segurança visualmente, com o MITRE ATT&CK como base.**

CSOC Flow é uma aplicação web open source para montar investigações e casos de uso de detecção em um canvas. Você
adiciona os fatos que encontrou (alertas, eventos de autenticação, processos, IPs, hashes, técnicas MITRE
ATT&CK...) e a aplicação correlaciona as evidências, sugere hipóteses, explica por que cada uma foi sugerida e
aponta os próximos passos da investigação.

Roda inteiramente no navegador: sem login, sem backend, sem nada que saia da sua máquina.

🔗 **[Abrir a aplicação](https://canakagawa.github.io/CSOCFlow/)** — não precisa instalar nada.

## Para que serve

Um caso de uso responde a uma pergunta simples, que nem sempre tem resposta fácil no dia a dia do SOC: **o que esse
alerta significa?** Analistas juniores e times executivos costumam ter dificuldade real de enxergar o que está
sendo tratado num alerta, e a explicação quase sempre sai mais complexa do que precisaria.

A ideia aqui é tornar isso visual. Você monta o caso de uso sobre o MITRE ATT&CK, correlaciona as TTPs, adiciona
insights externos, documenta o raciocínio e usa o resultado das duas formas: para entendimento técnico do time e
para apresentação executiva. Depois exporta em JSON, guarda junto da sua documentação, revisa com o time e adapta
ao seu ambiente.

> ⚠️ **A aplicação auxilia o raciocínio investigativo, mas não confirma incidentes automaticamente.** As pontuações
> de compatibilidade vêm de um conjunto de regras determinísticas e pesos — não são uma classificação definitiva.
> A decisão final é sempre do analista.

## O que dá para fazer

**No canvas**

- Arraste elementos da biblioteca ou clique para adicionar: táticas, técnicas e subtécnicas MITRE, tipos de
  evidência, alertas, notas do analista.
- Elementos livres para o que a base não cobre: texto, quadro branco, desenho à mão livre, imagem colada
  (`Ctrl+V`) e agrupamento.
- Seleção por retângulo com o botão esquerdo, navegação com o direito, `Ctrl`/`Shift`+clique para múltipla
  seleção, roda do mouse rola, `Shift`+roda rola na horizontal, `Ctrl`+roda dá zoom.
- Redimensionar qualquer elemento, ajustar ao conteúdo, ordenar em camadas, desfazer e refazer.
- **Cores por significado**: cada elemento se colore sozinho conforme o estado investigativo, numa escala de verde
  a vermelho — dá para ler o quadro de longe. E qualquer elemento (ou toda a seleção) pode ser pintado à mão pelo
  menu do botão direito.
- **Expandir subtécnicas** direto do nó da técnica, e retrair quando não precisar mais.
- **Conectar automaticamente** evidências relacionadas e **organizar como a matriz MITRE**, em um clique.
- **Modo apresentação** em tela cheia, para levar a investigação a uma reunião sem mostrar a ferramenta em volta.
- **Linha do tempo do ataque**, uma segunda leitura do mesmo quadro — veja abaixo.

**Correlação e leitura**

- Hipóteses sugeridas com a explicação de por que foram sugeridas, e verificações recomendadas.
- **Score da investigação** (0 a 100), medindo profundidade na kill chain, extensão da cadeia, atividade
  independente confirmada e cobertura — com o detalhamento por tática.
- Sugestão automática dos casos de uso compatíveis com as técnicas que estão no canvas.

**Sair da ferramenta**

- **Quatro modelos de exportação**, para você escolher o que o leitor deve ver — veja abaixo.
- **Camada do MITRE ATT&CK Navigator, nos dois sentidos.**
- Investigação salva localmente (IndexedDB) e importável de volta.
- Interface em **português, inglês e alemão**, tema claro/escuro/do sistema, e layout que funciona no celular.

## Linha do tempo do ataque

O canvas responde "o que achamos e como se conecta". A linha do tempo responde **"o que aconteceu, em que ordem"**
— que costuma ser a primeira pergunta de uma sala de diretoria. É a mesma investigação lida de outro jeito, e foi
pensada para a conversa executiva.

Ela abre em **Mostrar linha do tempo do ataque**, na barra de ferramentas, e ocupa uma faixa abaixo do canvas, fora
dele.

- **Nada é duplicado.** Cada card é um elemento do canvas: mudar um muda o outro, e clicar num card seleciona o
  elemento lá em cima. A ordem e os horários fazem parte da investigação, então acompanham o salvamento, a
  exportação e o desfazer.
- **Você numera os passos** — 1º, 2º, 3º — com as setas de cada card, ou **arrastando**: solte sobre uma coluna
  para juntar ao passo, ou sobre a fresta entre duas colunas para abrir um passo novo ali, empurrando os
  seguintes. O que compartilha o mesmo número **empilha na mesma coluna**, que é como se diz "isso aconteceu
  junto".
- **Cada elemento aceita um horário**, em texto livre de propósito: `10:42`, `2026-03-14 09:15` ou "por volta do
  meio-dia" são todos coisas que um analista precisa registrar. Dentro de um passo, os que têm horário vêm primeiro,
  na ordem do relógio.
- **Horário que anda para trás é apontado**: lendo a linha na ordem, cada horário deve ser igual ou posterior ao
  anterior, e o que não for ganha um aviso no card. É aviso, não bloqueio — o analista pode estar registrando
  exatamente o que o log diz, e uma sequência que parece invertida é dele para explicar. Horário de relógio nunca é
  comparado com data completa, e o que estiver escrito em prosa é deixado em paz.
- O que ainda não entrou na história fica numa bandeja embaixo; um clique põe no fim.
- Texto, quadros, desenhos, imagens, grupos e o esqueleto da matriz não entram: não são eventos.

## Exportar: quatro modelos

Em **Compartilhar**, a primeira pergunta é o que o leitor precisa ver, e só depois em que arquivo. Cada modelo sai
em **PDF, PPTX, PNG ou JPG**:

- **Somente o canvas** — o quadro como está, com as cores e as conexões.
- **Somente a linha do tempo** — a sequência sozinha, impressa em folha branca, não uma foto da interface escura.
- **Canvas e linha do tempo** — os dois na mesma peça: o quadro e, abaixo dele, a sequência.
- **Relatório executivo** — um documento em A4 com cabeçalho (caso, analista, data, situação, conclusão),
  pontuação da investigação e até onde a atividade confirmada chegou, resumo, a sequência numerada com horários, e
  **uma tabela com todos os elementos** — passo, horário, tipo, estado, a quem está conectado e as observações —
  mais a tabela de conexões.

E **Dados**, para outra ferramenta ler: JSON (a investigação inteira), CSV e a camada do ATT&CK Navigator.

O CSV é a mesma tabela do relatório, então planilha e documento nunca discordam. Ele sai com marca de ordem de
bytes (BOM) porque, sem ela, o Excel lê o arquivo na codificação do sistema e estraga todo acento de uma
investigação em português ou alemão.

## ATT&CK Navigator

A ferramenta troca camadas (_layers_) com o [ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/),
no formato 4.5, nos dois sentidos.

**Exportar** — em Compartilhar → _Camada do ATT&CK Navigator_. No Navigator, abra em _Open Existing Layer → Upload
from local_. Só técnicas e subtécnicas atravessam, cada uma na coluna da tática certa, com a pontuação vinda do
mesmo estado investigativo que colore o card: o que está confirmado chega vermelho na matriz. Suas notas viram o
comentário da célula, e uma cor escolhida à mão é respeitada.

**Importar** — pelo mesmo botão _Importar_ da barra de ferramentas, que reconhece se o arquivo é uma investigação
ou uma camada. As técnicas entram no canvas já organizadas como a matriz, somando-se ao que já está lá em vez de
substituir. Uma técnica que ocupa várias colunas vira **um** card, não um por coluna, e reimportar o mesmo arquivo
não duplica nada.

**O que entra é o que você marcou.** Um layer não guarda a sua seleção: clicar em células no Navigator não deixa
rastro no arquivo, enquanto _expandir subtécnicas_ escreve uma entrada para cada técnica que tenha subtécnicas. Por
isso a regra é: se alguma técnica da camada tem **pontuação, cor ou comentário**, só essas entram — o resto é estado
de layout. Se nada estiver marcado, a camada inteira entra, porque aí a lista é o conteúdo. A mensagem diz quantas
ficaram de fora.

Ou seja, para trazer uma escolha sua do Navigator: selecione as células e **aplique alguma coisa a elas** (uma
pontuação, uma cor ou um comentário) antes de exportar.

Um detalhe deliberado: **a pontuação de uma camada não vira veredito**. Nela cada autor mede uma coisa — cobertura,
confiança, prioridade — e ler isso como "confirmado malicioso" seria pôr palavras na boca do analista. As técnicas
chegam como _desconhecido_ e o número é anotado nas observações, para você decidir.

A camada declara a versão do ATT&CK que a base carrega (hoje a **v19**, a que renomeou Defense Evasion para Stealth
e criou Defense Impairment). O `npm run import:mitre` grava essa versão no manifesto lendo o próprio bundle do
MITRE, então ela nunca fica para trás dos dados. Um Navigator antigo pode recusar uma camada de uma versão que ele
não conhece.

## Casos de uso

A plataforma é orientada a **casos de uso de detecção**: cenários conhecidos (inspirados em regras de SIEM, como as
analytics rules do Microsoft Sentinel) que mapeiam técnicas e táticas MITRE para nomes de detecção que o analista
reconhece. Ao aplicar um caso de uso, ele conecta as técnicas relacionadas e apresenta um passo a passo de
investigação — incluindo, quando disponível, links para MITRE ATT&CK Detection Strategies.

**O seu caso de uso também entra.** No painel direito, aba **Use Cases**:

- **Importar JSON** — o arquivo fica guardado no seu navegador e em nenhum outro lugar. Ele passa a aparecer na
  biblioteca, nas sugestões e no motor de correlação como qualquer outro.
- **Exportar JSON** — em qualquer card, inclusive os que já vêm com a ferramenta. O ciclo fecha: exportar, editar
  no seu editor, importar de volta. Para partir de um caso nativo, troque o `id` no arquivo — a ferramenta recusa
  sobrescrever conteúdo de fábrica.

Do texto, só o inglês é obrigatório (`en`); `pt` e `de` são opcionais. O formato completo está em
[`public/data/schemas/use-case.schema.json`](public/data/schemas/use-case.schema.json), e os dois casos que
acompanham a ferramenta servem de modelo.

Se preferir que o caso de uso faça parte da ferramenta para todo mundo, e não só do seu navegador, coloque o
arquivo em `public/data/use-cases/`, registre-o no `manifest.json`, rode `npm run validate:knowledge` e abra um
pull request.

## Como executar localmente

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`. No painel direito, aba **Use Cases**, clique em **Carregar demo** para ver o fluxo
completo já preenchido: evidências → correlação → hipótese → verificações recomendadas.

## Como gerar o build

```bash
npm run build
npm run preview
```

O build é totalmente estático (`dist/`) e pode ser publicado em qualquer hospedagem de arquivos estáticos,
incluindo GitHub Pages (veja `.github/workflows/deploy.yml`).

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
| `npm run test:e2e`                | Testes end-to-end (Playwright) — suíte ainda a ser escrita.                  |
| `npm run validate:knowledge`      | Valida todos os arquivos JSON da base de conhecimento contra os schemas.     |
| `npm run import:mitre`            | Reimporta o catálogo MITRE ATT&CK Enterprise (táticas, técnicas, analytics). |

## Arquitetura

O projeto é organizado por funcionalidade, não por tipo de arquivo:

```text
src/
  app/                 Composição da aplicação (layout, barra superior, painéis laterais, tema)
  shared/              Tipos, i18n e utilitários compartilhados entre features
  features/
    canvas/            Canvas visual (React Flow), biblioteca, nós customizados, exportação de imagem/PDF/PPTX
    knowledge-base/    Carregador + validador (JSON Schema/Zod) da base de conhecimento — não depende de React
    correlation/       Motor de correlação puro (operadores, pontuação, explicações, inferência de relações)
    hypotheses/        Painel de hipóteses
    use-cases/         Casos de uso: painel, card, importação/exportação e armazenamento local dos seus próprios
    investigation/     Estado da investigação (Zustand), repositório (Dexie/IndexedDB), score, casos de demonstração

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

A biblioteca cobre o catálogo MITRE ATT&CK Enterprise completo (15 táticas e 697 técnicas e subtécnicas), em duas
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

Melhor dizer o que ainda não existe do que deixar você descobrir sozinho:

- **Cobertura da base**: das 697 técnicas do catálogo, 18 têm conteúdo didático curado e tradução completa; as
  demais trazem apenas os dados oficiais do MITRE, em inglês. Há 2 casos de uso, 1 hipótese e 2 verificações
  prontos.
- **Não há geração de relatório em Markdown nem linha do tempo visual** — os dois estão no roadmap.
- **Não há colaboração em tempo real.** Sem backend não dá: duas pessoas editando o mesmo canvas ao vivo exigiriam
  no mínimo um servidor de sinalização. Por ora, a troca é assíncrona, pelo JSON exportado.
- **Não há testes end-to-end** ainda (a suíte unitária tem 203 testes em 22 arquivos).

## Roadmap

Próximos marcos: relatório automático + linha do tempo visual; depois testes end-to-end, acessibilidade e mais
casos de demonstração. Mais adiante: criação de padrões investigativos pela própria interface e integrações com
SIEM/EDR.

## Contribuindo

Feedback da comunidade é muito bem-vindo — sugestões, melhorias, ideias ou crítica. Abra uma
[issue](https://github.com/CaNakagawa/CSOCFlow/issues) ou um pull request, que eu reviso e aplico o que fizer
sentido.

O caminho mais fácil de contribuir é pela base de conhecimento: um caso de uso novo, uma técnica curada com o
contexto investigativo bem escrito, ou uma tradução. Nada disso exige mexer em código.

Antes de abrir o PR:

```bash
npm run validate:knowledge
npm test
npm run lint
```

## MITRE ATT&CK

MITRE ATT&CK® é uma marca registrada da The MITRE Corporation. Este projeto não é afiliado ao MITRE; usa o conteúdo
público do framework sob os [termos de uso](https://attack.mitre.org/resources/legal-and-branding/terms-of-use/) do
próprio MITRE.

## Licença

[MIT](LICENSE).
