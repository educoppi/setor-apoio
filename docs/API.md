# API do Setor de Apoio - SENAI São Carlos

Referência de todas as requisições da API (versão `v1`), gerada a partir da especificação OpenAPI em `http://10.110.18.11:10901/v3/api-docs` (Swagger UI: `/swagger-ui/index.html`).

Total: **51 requisições** em 10 grupos.

## Sumário

- [Autenticação e convenções](#autenticacao-e-convencoes)
- [Alunos](#alunos) (7)
- [Autenticação](#autenticacao) (3)
- [Categorias](#categorias) (3)
- [Cursos](#cursos) (5)
- [Imagens](#imagens) (2)
- [Importação](#importacao) (1)
- [Ocorrências](#ocorrencias) (6)
- [Solicitações](#solicitacoes) (10)
- [Turmas](#turmas) (7)
- [Usuários](#usuarios) (7)
- [Modelos (schemas)](#modelos-schemas)

## Autenticação e convenções

- **Servidor:** `http://10.110.18.11:10901`
- **Login:** `POST /api/v1/auth/login` com `{ nif, senha }` devolve `accessToken` (JWT).
- **Autorização:** todas as demais requisições enviam o cabeçalho `Authorization: Bearer <accessToken>`.
- **Paginação:** listagens paginadas aceitam `page` (começa em 0), `size` e `sort` (`propriedade,asc|desc`, pode repetir) e devolvem `{ content: [...], page: { size, number, totalElements, totalPages } }`.
- **Datas:** `date` no formato `AAAA-MM-DD`; `date-time` em ISO-8601.

### Visão geral

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | [`/api/v1/alunos`](#get-apiv1alunos) | Lista/busca alunos |
| `POST` | [`/api/v1/alunos`](#post-apiv1alunos) | Cria a ficha de um aluno |
| `GET` | [`/api/v1/alunos/{id}`](#get-apiv1alunosid) | Ficha completa do aluno |
| `PUT` | [`/api/v1/alunos/{id}`](#put-apiv1alunosid) | Atualiza a ficha de um aluno |
| `GET` | [`/api/v1/alunos/{id}/vinculos`](#get-apiv1alunosidvinculos) | Vínculos acadêmicos (matrículas) do aluno |
| `POST` | [`/api/v1/alunos/{id}/vinculos`](#post-apiv1alunosidvinculos) | Matricula o aluno em uma turma |
| `PATCH` | [`/api/v1/vinculos/{id}/situacao`](#patch-apiv1vinculosidsituacao) | Altera a situação de um vínculo (trancado, evadido, concluído...) |
| `POST` | [`/api/v1/auth/login`](#post-apiv1authlogin) | Login com NIF e senha |
| `GET` | [`/api/v1/auth/me`](#get-apiv1authme) | Dados do usuário logado |
| `PUT` | [`/api/v1/auth/senha`](#put-apiv1authsenha) | Altera a própria senha |
| `GET` | [`/api/v1/categorias`](#get-apiv1categorias) | Lista categorias |
| `POST` | [`/api/v1/categorias`](#post-apiv1categorias) | Cria uma categoria |
| `PUT` | [`/api/v1/categorias/{id}`](#put-apiv1categoriasid) | Atualiza (ou desativa) uma categoria |
| `GET` | [`/api/v1/cursos`](#get-apiv1cursos) | Lista cursos |
| `POST` | [`/api/v1/cursos`](#post-apiv1cursos) | Cria um curso |
| `GET` | [`/api/v1/cursos/{id}`](#get-apiv1cursosid) | Busca um curso |
| `PUT` | [`/api/v1/cursos/{id}`](#put-apiv1cursosid) | Atualiza um curso |
| `DELETE` | [`/api/v1/cursos/{id}`](#delete-apiv1cursosid) | Exclui um curso |
| `POST` | [`/api/v1/imagens`](#post-apiv1imagens) | Envia uma imagem |
| `GET` | [`/api/v1/imagens/{nome}`](#get-apiv1imagensnome) | Baixa uma imagem |
| `POST` | [`/api/v1/importacao/alunos`](#post-apiv1importacaoalunos) | Importa alunos de um CSV para uma turma |
| `GET` | [`/api/v1/alunos/{alunoId}/ocorrencias`](#get-apiv1alunosalunoidocorrencias) | Ocorrências de um aluno (mais recentes primeiro) |
| `GET` | [`/api/v1/ocorrencias`](#get-apiv1ocorrencias) | Lista ocorrências |
| `POST` | [`/api/v1/ocorrencias`](#post-apiv1ocorrencias) | Registra uma ocorrência |
| `GET` | [`/api/v1/ocorrencias/{id}`](#get-apiv1ocorrenciasid) | Busca uma ocorrência |
| `PUT` | [`/api/v1/ocorrencias/{id}`](#put-apiv1ocorrenciasid) | Atualiza uma ocorrência |
| `DELETE` | [`/api/v1/ocorrencias/{id}`](#delete-apiv1ocorrenciasid) | Exclui (logicamente) uma ocorrência |
| `GET` | [`/api/v1/solicitacoes`](#get-apiv1solicitacoes) | Lista solicitações visíveis ao usuário |
| `POST` | [`/api/v1/solicitacoes`](#post-apiv1solicitacoes) | Abre uma solicitação |
| `GET` | [`/api/v1/solicitacoes/{id}`](#get-apiv1solicitacoesid) | Detalhe da solicitação, com histórico de status e feedback |
| `PATCH` | [`/api/v1/solicitacoes/{id}/atendente`](#patch-apiv1solicitacoesidatendente) | Repassa para outra atendente (setor de apoio) |
| `PATCH` | [`/api/v1/solicitacoes/{id}/feedback`](#patch-apiv1solicitacoesidfeedback) | Registra o feedback ao solicitante (setor de apoio) |
| `POST` | [`/api/v1/solicitacoes/{id}/finalizar`](#post-apiv1solicitacoesidfinalizar) | Responde ao solicitante e finaliza (setor de apoio) |
| `PATCH` | [`/api/v1/solicitacoes/{id}/status`](#patch-apiv1solicitacoesidstatus) | Avança o status (setor de apoio) |
| `GET` | [`/api/v1/solicitacoes/alunos`](#get-apiv1solicitacoesalunos) | Busca alunos para abrir uma solicitação |
| `GET` | [`/api/v1/solicitacoes/atendentes`](#get-apiv1solicitacoesatendentes) | Funcionárias do setor de apoio que podem atender |
| `GET` | [`/api/v1/solicitacoes/painel`](#get-apiv1solicitacoespainel) | Estatísticas do painel do setor de apoio |
| `GET` | [`/api/v1/turmas`](#get-apiv1turmas) | Lista turmas |
| `POST` | [`/api/v1/turmas`](#post-apiv1turmas) | Cria uma turma |
| `GET` | [`/api/v1/turmas/{id}`](#get-apiv1turmasid) | Busca uma turma |
| `PUT` | [`/api/v1/turmas/{id}`](#put-apiv1turmasid) | Atualiza uma turma |
| `GET` | [`/api/v1/turmas/{id}/usuarios`](#get-apiv1turmasidusuarios) | Usuários (professores, coordenação...) vinculados à turma |
| `POST` | [`/api/v1/turmas/{id}/usuarios`](#post-apiv1turmasidusuarios) | Vincula usuários à turma |
| `DELETE` | [`/api/v1/turmas/{id}/usuarios/{usuarioId}`](#delete-apiv1turmasidusuariosusuarioid) | Remove o vínculo de um usuário com a turma |
| `GET` | [`/api/v1/usuarios`](#get-apiv1usuarios) | Lista usuários |
| `POST` | [`/api/v1/usuarios`](#post-apiv1usuarios) | Cria um usuário |
| `GET` | [`/api/v1/usuarios/{id}`](#get-apiv1usuariosid) | Busca um usuário |
| `PUT` | [`/api/v1/usuarios/{id}`](#put-apiv1usuariosid) | Atualiza um usuário |
| `PATCH` | [`/api/v1/usuarios/{id}/ativo`](#patch-apiv1usuariosidativo) | Ativa ou desativa um usuário |
| `PATCH` | [`/api/v1/usuarios/{id}/senha`](#patch-apiv1usuariosidsenha) | Redefine a senha de um usuário |
| `GET` | [`/api/v1/usuarios/me/turmas`](#get-apiv1usuariosmeturmas) | Turmas vinculadas ao usuário logado |

## Alunos

_Ficha única do aluno e vínculos acadêmicos (exclusivo do setor de apoio)_

### GET /api/v1/alunos

**Lista/busca alunos**

`busca` aceita parte do nome (ignora acentos), CPF ou matrícula.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `busca` | query | string | não |  |
| `turmaId` | query | integer (int64) | não |  |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `10` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["nome,ASC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelAlunoResumo](#pagedmodelalunoresumo) |

### POST /api/v1/alunos

**Cria a ficha de um aluno**

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [AlunoRequest](#alunorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [AlunoResponse](#alunoresponse) |

### GET /api/v1/alunos/{id}

**Ficha completa do aluno**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [AlunoResponse](#alunoresponse) |

### PUT /api/v1/alunos/{id}

**Atualiza a ficha de um aluno**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [AlunoRequest](#alunorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [AlunoResponse](#alunoresponse) |

### GET /api/v1/alunos/{id}/vinculos

**Vínculos acadêmicos (matrículas) do aluno**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [VinculoResponse](#vinculoresponse)[] |

### POST /api/v1/alunos/{id}/vinculos

**Matricula o aluno em uma turma**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [VinculoRequest](#vinculorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [VinculoResponse](#vinculoresponse) |

### PATCH /api/v1/vinculos/{id}/situacao

**Altera a situação de um vínculo (trancado, evadido, concluído...)**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [SituacaoVinculoRequest](#situacaovinculorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [VinculoResponse](#vinculoresponse) |

## Autenticação

### POST /api/v1/auth/login

**Login com NIF e senha**

Retorna o token JWT para usar no cabeçalho Authorization: Bearer <token>.

Autenticação: não exige

**Corpo da requisição** (obrigatório)

- `application/json`: [LoginRequest](#loginrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [TokenResponse](#tokenresponse) |

### GET /api/v1/auth/me

**Dados do usuário logado**

Autenticação: Bearer JWT

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResponse](#usuarioresponse) |

### PUT /api/v1/auth/senha

**Altera a própria senha**

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [AlterarSenhaRequest](#alterarsenharequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 204 | No Content | — |

## Categorias

_Marcadores das ocorrências_

### GET /api/v1/categorias

**Lista categorias**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `somenteAtivas` | query | boolean | não | padrão: `false` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [CategoriaResponse](#categoriaresponse)[] |

### POST /api/v1/categorias

**Cria uma categoria**

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [CategoriaRequest](#categoriarequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [CategoriaResponse](#categoriaresponse) |

### PUT /api/v1/categorias/{id}

**Atualiza (ou desativa) uma categoria**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [CategoriaRequest](#categoriarequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [CategoriaResponse](#categoriaresponse) |

## Cursos

### GET /api/v1/cursos

**Lista cursos**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `somenteAtivos` | query | boolean | não | padrão: `false` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [CursoResponse](#cursoresponse)[] |

### POST /api/v1/cursos

**Cria um curso**

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [CursoRequest](#cursorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [CursoResponse](#cursoresponse) |

### GET /api/v1/cursos/{id}

**Busca um curso**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [CursoResponse](#cursoresponse) |

### PUT /api/v1/cursos/{id}

**Atualiza um curso**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [CursoRequest](#cursorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [CursoResponse](#cursoresponse) |

### DELETE /api/v1/cursos/{id}

**Exclui um curso**

Retorna 409 se houver turmas no curso; nesse caso, desative-o.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 204 | No Content | — |

## Imagens

_Envio e exibição das imagens das ocorrências (exclusivo do setor de apoio)_

### POST /api/v1/imagens

**Envia uma imagem**

JPG, PNG ou WebP, até 10 MB. Devolve o link a ser enviado em `imagens` ao criar ou editar a ocorrência.

Autenticação: Bearer JWT

**Corpo da requisição**

- `multipart/form-data`:

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `arquivo` | string (binary) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [ImagemResponse](#imagemresponse) |

### GET /api/v1/imagens/{nome}

**Baixa uma imagem**

Exige login: as imagens contêm dados sensíveis de alunos.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `nome` | path | string | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | string (binary) |

## Importação

### POST /api/v1/importacao/alunos

**Importa alunos de um CSV para uma turma**

Cabeçalho obrigatório: `cpf;nome;data_nascimento;matricula`. Opcionais: `email;celular;cep;rua;numero;bairro;cidade`. Separador `;` ou `,`, codificação UTF-8, datas em `dd/MM/aaaa` ou `aaaa-MM-dd`. Alunos já existentes (mesmo CPF) são atualizados. Linhas com erro são listadas no relatório e não impedem as demais.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `turmaId` | query | integer (int64) | sim |  |

**Corpo da requisição**

- `multipart/form-data`:

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `arquivo` | string (binary) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [RelatorioImportacao](#relatorioimportacao) |

## Ocorrências

_Registros da ficha do aluno (exclusivo do setor de apoio)_

### GET /api/v1/alunos/{alunoId}/ocorrencias

**Ocorrências de um aluno (mais recentes primeiro)**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `alunoId` | path | integer (int64) | sim |  |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `10` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["dataHora,DESC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelOcorrenciaResponse](#pagedmodelocorrenciaresponse) |

### GET /api/v1/ocorrencias

**Lista ocorrências**

Filtros opcionais; datas no formato AAAA-MM-DD.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `alunoId` | query | integer (int64) | não |  |
| `categoriaId` | query | integer (int64) | não |  |
| `origem` | query | string | não | valores: `CORPO_DOCENTE`, `PROPRIO_ALUNO`, `CORPO_DISCENTE`, `EMPRESA`, `FAMILIA`, `OUTROS` |
| `de` | query | string (date) | não |  |
| `ate` | query | string (date) | não |  |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `10` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["dataHora,DESC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelOcorrenciaResponse](#pagedmodelocorrenciaresponse) |

### POST /api/v1/ocorrencias

**Registra uma ocorrência**

O responsável é o usuário logado. Pode associar solicitações do mesmo aluno que ainda não foram finalizadas.

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [OcorrenciaRequest](#ocorrenciarequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [OcorrenciaResponse](#ocorrenciaresponse) |

### GET /api/v1/ocorrencias/{id}

**Busca uma ocorrência**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [OcorrenciaResponse](#ocorrenciaresponse) |

### PUT /api/v1/ocorrencias/{id}

**Atualiza uma ocorrência**

Somente o autor ou um administrador.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [OcorrenciaUpdateRequest](#ocorrenciaupdaterequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [OcorrenciaResponse](#ocorrenciaresponse) |

### DELETE /api/v1/ocorrencias/{id}

**Exclui (logicamente) uma ocorrência**

Somente o autor ou um administrador.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 204 | No Content | — |

## Solicitações

_Pedidos de acompanhamento abertos por professores, coordenação, biblioteca etc._

### GET /api/v1/solicitacoes

**Lista solicitações visíveis ao usuário**

Setor de apoio vê todas. Demais usuários veem as próprias e as COMPARTILHADAS das suas turmas. Use `minhas=true` para listar só as que você abriu, `atendenteId` para as de uma atendente (ou `semAtendente=true`) e `emAberto=true` para as não finalizadas.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `status` | query | string | não | valores: `AGUARDANDO_ACOMPANHAMENTO`, `EM_ANDAMENTO`, `FINALIZADO` |
| `motivo` | query | string | não | valores: `COMPORTAMENTAL`, `FREQUENCIA`, `APROVEITAMENTO`, `OUTROS` |
| `turmaId` | query | integer (int64) | não |  |
| `alunoId` | query | integer (int64) | não |  |
| `cursoId` | query | integer (int64) | não |  |
| `atendenteId` | query | integer (int64) | não |  |
| `semAtendente` | query | boolean | não | padrão: `false` |
| `emAberto` | query | boolean | não | padrão: `false` |
| `minhas` | query | boolean | não | padrão: `false` |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `10` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["dataHora,DESC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelSolicitacaoResponse](#pagedmodelsolicitacaoresponse) |

### POST /api/v1/solicitacoes

**Abre uma solicitação**

Sem `atendenteId`, a atendente é a responsável do curso da turma (se houver).

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [SolicitacaoRequest](#solicitacaorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [SolicitacaoResponse](#solicitacaoresponse) |

### GET /api/v1/solicitacoes/{id}

**Detalhe da solicitação, com histórico de status e feedback**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [SolicitacaoResponse](#solicitacaoresponse) |

### PATCH /api/v1/solicitacoes/{id}/atendente

**Repassa para outra atendente (setor de apoio)**

Não vale para solicitações finalizadas. O repasse fica no histórico.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [RepassarRequest](#repassarrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [SolicitacaoResponse](#solicitacaoresponse) |

### PATCH /api/v1/solicitacoes/{id}/feedback

**Registra o feedback ao solicitante (setor de apoio)**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [FeedbackRequest](#feedbackrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [SolicitacaoResponse](#solicitacaoresponse) |

### POST /api/v1/solicitacoes/{id}/finalizar

**Responde ao solicitante e finaliza (setor de apoio)**

Grava o feedback e muda o status para FINALIZADO numa única operação. O feedback é obrigatório.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [FinalizarRequest](#finalizarrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [SolicitacaoResponse](#solicitacaoresponse) |

### PATCH /api/v1/solicitacoes/{id}/status

**Avança o status (setor de apoio)**

AGUARDANDO_ACOMPANHAMENTO → EM_ANDAMENTO → FINALIZADO. Para finalizar, registre antes o feedback.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [StatusRequest](#statusrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [SolicitacaoResponse](#solicitacaoresponse) |

### GET /api/v1/solicitacoes/alunos

**Busca alunos para abrir uma solicitação**

Nome (mín. 3 caracteres) ou matrícula. Retorna apenas dados mínimos, sem acesso à ficha.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `busca` | query | string | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [AlunoSolicitacaoResumo](#alunosolicitacaoresumo)[] |

### GET /api/v1/solicitacoes/atendentes

**Funcionárias do setor de apoio que podem atender**

Usuários ativos com cargo Setor de apoio. Usado para escolher quem atende ao abrir ou repassar.

Autenticação: Bearer JWT

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResumo](#usuarioresumo)[] |

### GET /api/v1/solicitacoes/painel

**Estatísticas do painel do setor de apoio**

Totais em aberto, fila das mais antigas, motivos, cursos e evolução semanal dos últimos `meses`. Com `atendenteId`, só as solicitações dessa atendente.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `atendenteId` | query | integer (int64) | não |  |
| `meses` | query | integer (int32) | não | padrão: `6` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PainelResponse](#painelresponse) |

## Turmas

### GET /api/v1/turmas

**Lista turmas**

Filtros opcionais por unidade, curso e situação.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `unidade` | query | string | não | valores: `SAO_CARLOS`, `DESCALVADO`, `PORTO_FERREIRA`, `SANTA_RITA_DO_PASSA_QUATRO` |
| `cursoId` | query | integer (int64) | não |  |
| `ativo` | query | boolean | não |  |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `50` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["nome,ASC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelTurmaResponse](#pagedmodelturmaresponse) |

### POST /api/v1/turmas

**Cria uma turma**

Se a unidade não for informada, assume SAO_CARLOS.

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [TurmaRequest](#turmarequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [TurmaResponse](#turmaresponse) |

### GET /api/v1/turmas/{id}

**Busca uma turma**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [TurmaResponse](#turmaresponse) |

### PUT /api/v1/turmas/{id}

**Atualiza uma turma**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [TurmaRequest](#turmarequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [TurmaResponse](#turmaresponse) |

### GET /api/v1/turmas/{id}/usuarios

**Usuários (professores, coordenação...) vinculados à turma**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResumo](#usuarioresumo)[] |

### POST /api/v1/turmas/{id}/usuarios

**Vincula usuários à turma**

Usuários vinculados veem as solicitações COMPARTILHADAS da turma.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [VincularUsuariosRequest](#vincularusuariosrequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResumo](#usuarioresumo)[] |

### DELETE /api/v1/turmas/{id}/usuarios/{usuarioId}

**Remove o vínculo de um usuário com a turma**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |
| `usuarioId` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 204 | No Content | — |

## Usuários

_Gestão de usuários (administrador)_

### GET /api/v1/usuarios

**Lista usuários**

Busca por nome (sem acento) ou NIF.

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `busca` | query | string | não |  |
| `page` | query | integer | não | Zero-based page index (0..N) — mínimo 0; padrão: `0` |
| `size` | query | integer | não | The size of the page to be returned — mínimo 1; padrão: `10` |
| `sort` | query | string[] | não | Sorting criteria in the format: property,(asc\|desc). Default sort order is ascending. Multiple sort criteria are supported. — padrão: `["nome,ASC"]` |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [PagedModelUsuarioResponse](#pagedmodelusuarioresponse) |

### POST /api/v1/usuarios

**Cria um usuário**

O NIF é o login. Use role SOLICITANTE para professores, coordenação, biblioteca etc.

Autenticação: Bearer JWT

**Corpo da requisição** (obrigatório)

- `application/json`: [UsuarioRequest](#usuariorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 201 | Created | [UsuarioResponse](#usuarioresponse) |

### GET /api/v1/usuarios/{id}

**Busca um usuário**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResponse](#usuarioresponse) |

### PUT /api/v1/usuarios/{id}

**Atualiza um usuário**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [UsuarioUpdateRequest](#usuarioupdaterequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResponse](#usuarioresponse) |

### PATCH /api/v1/usuarios/{id}/ativo

**Ativa ou desativa um usuário**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [AtivoRequest](#ativorequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [UsuarioResponse](#usuarioresponse) |

### PATCH /api/v1/usuarios/{id}/senha

**Redefine a senha de um usuário**

Autenticação: Bearer JWT

**Parâmetros**

| Nome | Onde | Tipo | Obrigatório | Descrição |
|---|---|---|---|---|
| `id` | path | integer (int64) | sim |  |

**Corpo da requisição** (obrigatório)

- `application/json`: [NovaSenhaRequest](#novasenharequest)

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 204 | No Content | — |

### GET /api/v1/usuarios/me/turmas

**Turmas vinculadas ao usuário logado**

Autenticação: Bearer JWT

**Respostas**

| Código | Descrição | Conteúdo |
|---|---|---|
| 200 | OK | [TurmaResponse](#turmaresponse)[] |

## Modelos (schemas)

### AlterarSenhaRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `senhaAtual` | string | sim | mín. 1 caracteres |
| `novaSenha` | string | sim | mín. 8 caracteres; máx. 72 caracteres |

### AlunoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `cpf` | string | sim | Com ou sem pontuação — mín. 1 caracteres — ex.: `"52998224725"` |
| `nome` | string | sim | máx. 100 caracteres — ex.: `"João da Silva"` |
| `dataNascimento` | string (date) | sim | ex.: `"2008-05-20"` |
| `email` | string (email) | não | máx. 150 caracteres |
| `celular` | string | não | padrão: `\d{10,11}` — ex.: `"16999998888"` |
| `cep` | string | não | padrão: `\d{8}` |
| `rua` | string | não | máx. 100 caracteres |
| `numero` | string | não | máx. 10 caracteres |
| `bairro` | string | não | máx. 100 caracteres |
| `cidade` | string | não | máx. 100 caracteres — ex.: `"São Carlos"` |
| `moraCom` | string | não | máx. 100 caracteres — ex.: `"Mãe e irmão"` |
| `fotoUrl` | string | não | Link para a foto (a imagem não é armazenada no banco) — máx. 2048 caracteres; padrão: `^https?://.+` — ex.: `"https://exemplo.com/fotos/joao.jpg"` |
| `situacaoProfissional` | string | não | valores: `EMPREGADO`, `DESEMPREGADO`, `JOVEM_APRENDIZ`, `ESTAGIARIO` |
| `empresa` | string | não | máx. 100 caracteres |
| `nomeContatoEmergencia` | string | não | máx. 100 caracteres |
| `parentescoContatoEmergencia` | string | não | máx. 50 caracteres |
| `celularContatoEmergencia` | string | não | padrão: `\d{10,11}` |
| `infoQualitativa` | string | não | Informações qualitativas: atividades de que gosta, esporte favorito etc. |

### AlunoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `cpf` | string | não |  |
| `nome` | string | não |  |
| `dataNascimento` | string (date) | não |  |
| `email` | string | não |  |
| `celular` | string | não |  |
| `cep` | string | não |  |
| `rua` | string | não |  |
| `numero` | string | não |  |
| `bairro` | string | não |  |
| `cidade` | string | não |  |
| `moraCom` | string | não |  |
| `fotoUrl` | string | não |  |
| `situacaoProfissional` | string | não | valores: `EMPREGADO`, `DESEMPREGADO`, `JOVEM_APRENDIZ`, `ESTAGIARIO` |
| `empresa` | string | não |  |
| `nomeContatoEmergencia` | string | não |  |
| `parentescoContatoEmergencia` | string | não |  |
| `celularContatoEmergencia` | string | não |  |
| `infoQualitativa` | string | não |  |
| `vinculos` | [VinculoResponse](#vinculoresponse)[] | não |  |
| `createdAt` | string (date-time) | não |  |
| `updatedAt` | string (date-time) | não |  |

### AlunoResumo

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `cpf` | string | não |  |
| `nome` | string | não |  |
| `dataNascimento` | string (date) | não |  |
| `fotoUrl` | string | não |  |
| `vinculos` | [VinculoResponse](#vinculoresponse)[] | não |  |

### AlunoSolicitacaoResumo

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `vinculoAcademicoId` | integer (int64) | não |  |
| `alunoId` | integer (int64) | não |  |
| `matricula` | string | não |  |
| `alunoNome` | string | não |  |
| `turmaId` | integer (int64) | não |  |
| `turmaNome` | string | não |  |
| `cursoNome` | string | não |  |
| `unidade` | string | não | valores: `SAO_CARLOS`, `DESCALVADO`, `PORTO_FERREIRA`, `SANTA_RITA_DO_PASSA_QUATRO` |
| `responsavelCurso` | [UsuarioResumo](#usuarioresumo) | não | Funcionária do setor de apoio responsável pelo curso (sugestão de atendente) |
| `minhaTurma` | boolean | não | A turma é uma das vinculadas ao usuário logado |

### AtivoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `ativo` | boolean | sim |  |

### CategoriaRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `nome` | string | sim | máx. 50 caracteres — ex.: `"Saúde Mental/Emocional"` |
| `ativo` | boolean | não | Padrão: true |

### CategoriaResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `nome` | string | não |  |
| `ativo` | boolean | não |  |

### Contagem

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `chave` | string | não |  |
| `nome` | string | não |  |
| `total` | integer (int64) | não |  |

### CursoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `nome` | string | sim | máx. 100 caracteres — ex.: `"Técnico em Desenvolvimento de Sistemas"` |
| `modalidade` | string | sim | valores: `CST`, `CT`, `CAI` |
| `ativo` | boolean | não | Padrão: true |
| `responsavelId` | integer (int64) | não | Funcionária do setor de apoio sugerida nas solicitações deste curso (GET /solicitacoes/atendentes) |

### CursoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `nome` | string | não |  |
| `modalidade` | string | não | valores: `CST`, `CT`, `CAI` |
| `ativo` | boolean | não |  |
| `responsavel` | [UsuarioResumo](#usuarioresumo) | não |  |

### ErroLinha

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `linha` | integer (int64) | não |  |
| `motivo` | string | não |  |

### FeedbackRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `feedback` | string | sim | mín. 1 caracteres |

### FinalizarRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `feedback` | string | sim | Retorno ao solicitante; ele verá este texto — mín. 1 caracteres |
| `observacao` | string | não | Observação interna, fica no histórico — máx. 500 caracteres |

### HistoricoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `status` | string | não | valores: `AGUARDANDO_ACOMPANHAMENTO`, `EM_ANDAMENTO`, `FINALIZADO` |
| `usuario` | [UsuarioResumo](#usuarioresumo) | não |  |
| `observacao` | string | não |  |
| `dataHora` | string (date-time) | não |  |

### ImagemResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `url` | string | não | Link da imagem, para enviar em `imagens` da ocorrência — ex.: `"/api/v1/imagens/3f2c9a7e5b1d4c8e9f0a1b2c3d4e5f60.jpg"` |

### ItemFila

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `alunoNome` | string | não |  |
| `turmaNome` | string | não |  |
| `cursoNome` | string | não |  |
| `motivo` | string | não | valores: `COMPORTAMENTAL`, `FREQUENCIA`, `APROVEITAMENTO`, `OUTROS` |
| `status` | string | não | valores: `AGUARDANDO_ACOMPANHAMENTO`, `EM_ANDAMENTO`, `FINALIZADO` |
| `dataHora` | string (date-time) | não |  |
| `atendente` | [UsuarioResumo](#usuarioresumo) | não |  |
| `diasAberta` | integer (int64) | não |  |

### LoginRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `nif` | string | sim | mín. 1 caracteres — ex.: `"admin"` |
| `senha` | string | sim | mín. 1 caracteres — ex.: `"admin123"` |

### NovaSenhaRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `novaSenha` | string | sim | mín. 8 caracteres; máx. 72 caracteres |

### OcorrenciaRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `alunoId` | integer (int64) | sim |  |
| `descricao` | string | sim | mín. 1 caracteres |
| `origem` | string | sim | valores: `CORPO_DOCENTE`, `PROPRIO_ALUNO`, `CORPO_DISCENTE`, `EMPRESA`, `FAMILIA`, `OUTROS` |
| `categoriaIds` | integer (int64)[] | sim | IDs das categorias (marcadores); ao menos uma — mín. 1 item(ns) |
| `imagens` | string[] | não | Links devolvidos por POST /imagens (máx. 5); a imagem não é armazenada no banco — máx. 5 itens; cada item: máx. 2048 caracteres; padrão de cada item: `^(https?://.+\|/api/v1/imagens/[0-9a-f]{32}\.(jpg\|png\|webp))$` |
| `solicitacaoIds` | integer (int64)[] | não | Solicitações do mesmo aluno tratadas por esta ocorrência |

### OcorrenciaResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `alunoId` | integer (int64) | não |  |
| `alunoNome` | string | não |  |
| `responsavel` | [UsuarioResumo](#usuarioresumo) | não |  |
| `dataHora` | string (date-time) | não |  |
| `descricao` | string | não |  |
| `origem` | string | não | valores: `CORPO_DOCENTE`, `PROPRIO_ALUNO`, `CORPO_DISCENTE`, `EMPRESA`, `FAMILIA`, `OUTROS` |
| `categorias` | [CategoriaResponse](#categoriaresponse)[] | não |  |
| `imagens` | string[] | não |  |
| `solicitacaoIds` | integer (int64)[] | não |  |
| `updatedAt` | string (date-time) | não |  |

### OcorrenciaUpdateRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `descricao` | string | sim | mín. 1 caracteres |
| `origem` | string | sim | valores: `CORPO_DOCENTE`, `PROPRIO_ALUNO`, `CORPO_DISCENTE`, `EMPRESA`, `FAMILIA`, `OUTROS` |
| `categoriaIds` | integer (int64)[] | sim | mín. 1 item(ns) |
| `imagens` | string[] | não | Substitui a lista de imagens atual (máx. 5) — máx. 5 itens; cada item: máx. 2048 caracteres; padrão de cada item: `^(https?://.+\|/api/v1/imagens/[0-9a-f]{32}\.(jpg\|png\|webp))$` |
| `solicitacaoIds` | integer (int64)[] | não | Solicitações a associar (as já associadas são mantidas) |

### PagedModelAlunoResumo

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `content` | [AlunoResumo](#alunoresumo)[] | não |  |
| `page` | [PageMetadata](#pagemetadata) | não |  |

### PagedModelOcorrenciaResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `content` | [OcorrenciaResponse](#ocorrenciaresponse)[] | não |  |
| `page` | [PageMetadata](#pagemetadata) | não |  |

### PagedModelSolicitacaoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `content` | [SolicitacaoResponse](#solicitacaoresponse)[] | não |  |
| `page` | [PageMetadata](#pagemetadata) | não |  |

### PagedModelTurmaResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `content` | [TurmaResponse](#turmaresponse)[] | não |  |
| `page` | [PageMetadata](#pagemetadata) | não |  |

### PagedModelUsuarioResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `content` | [UsuarioResponse](#usuarioresponse)[] | não |  |
| `page` | [PageMetadata](#pagemetadata) | não |  |

### PageMetadata

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `size` | integer (int64) | não |  |
| `number` | integer (int64) | não |  |
| `totalElements` | integer (int64) | não |  |
| `totalPages` | integer (int64) | não |  |

### PainelResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `totais` | [Totais](#totais) | não |  |
| `fila` | [ItemFila](#itemfila)[] | não | Solicitações em aberto há mais tempo (mais antigas primeiro) |
| `porMotivo` | [Contagem](#contagem)[] | não | Abertas no período, por motivo |
| `porCurso` | [Contagem](#contagem)[] | não | Abertas no período, por curso (mais pedidos primeiro) |
| `evolucao` | [Semana](#semana)[] | não | Abertas e finalizadas por semana no período |
| `inicioPeriodo` | string (date) | não | Início do período das estatísticas |

### RelatorioImportacao

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `totalLinhas` | integer (int32) | não |  |
| `criados` | integer (int32) | não |  |
| `atualizados` | integer (int32) | não |  |
| `erros` | [ErroLinha](#errolinha)[] | não |  |

### RepassarRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `atendenteId` | integer (int64) | sim | Nova atendente (GET /solicitacoes/atendentes) |
| `observacao` | string | não | Motivo do repasse, fica no histórico — máx. 350 caracteres |

### Semana

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `inicio` | string (date) | não | Segunda-feira da semana |
| `abertas` | integer (int64) | não |  |
| `finalizadas` | integer (int64) | não |  |

### SituacaoVinculoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `situacao` | string | sim | valores: `EM_ANDAMENTO`, `TRANCADO`, `CONCLUIDO`, `CANCELADO`, `EVADIDO` |

### SolicitacaoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `vinculoAcademicoId` | integer (int64) | sim | ID do vínculo acadêmico (obtido em GET /solicitacoes/alunos) |
| `unidadeCurricular` | string | não | máx. 100 caracteres — ex.: `"Lógica de Programação"` |
| `motivo` | string | sim | valores: `COMPORTAMENTAL`, `FREQUENCIA`, `APROVEITAMENTO`, `OUTROS` |
| `descricao` | string | sim | mín. 1 caracteres — ex.: `"Aluno com 6 faltas seguidas e sem resposta aos contatos."` |
| `visibilidade` | string | não | Padrão: COMPARTILHADO. PRIVADO restringe ao autor e ao setor de apoio. — valores: `COMPARTILHADO`, `PRIVADO` |
| `atendenteId` | integer (int64) | não | Funcionária do setor de apoio que vai atender (GET /solicitacoes/atendentes). Se vazio, usa a responsável do curso da turma. |

### SolicitacaoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `solicitante` | [UsuarioResumo](#usuarioresumo) | não |  |
| `cargoSolicitante` | string | não | valores: `SETOR_APOIO`, `PROFESSOR`, `COORDENADOR`, `BIBLIOTECARIO`, `SECRETARIA`, `OUTRO` |
| `atendente` | [UsuarioResumo](#usuarioresumo) | não |  |
| `aluno` | [AlunoSolicitacaoResumo](#alunosolicitacaoresumo) | não |  |
| `unidadeCurricular` | string | não |  |
| `motivo` | string | não | valores: `COMPORTAMENTAL`, `FREQUENCIA`, `APROVEITAMENTO`, `OUTROS` |
| `descricao` | string | não |  |
| `visibilidade` | string | não | valores: `COMPARTILHADO`, `PRIVADO` |
| `status` | string | não | valores: `AGUARDANDO_ACOMPANHAMENTO`, `EM_ANDAMENTO`, `FINALIZADO` |
| `feedback` | string | não |  |
| `ocorrenciaId` | integer (int64) | não |  |
| `dataHora` | string (date-time) | não |  |
| `dataAtualizacao` | string (date-time) | não |  |
| `dataFinalizacao` | string (date-time) | não |  |
| `historico` | [HistoricoResponse](#historicoresponse)[] | não |  |

### StatusRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `status` | string | sim | valores: `AGUARDANDO_ACOMPANHAMENTO`, `EM_ANDAMENTO`, `FINALIZADO` |
| `observacao` | string | não | máx. 500 caracteres |

### TokenResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `accessToken` | string | não |  |
| `tokenType` | string | não |  |
| `expiresIn` | integer (int64) | não |  |
| `usuario` | [UsuarioResponse](#usuarioresponse) | não |  |

### Totais

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `aguardando` | integer (int64) | não | Aguardando acompanhamento (todas, sem limite de período) |
| `emAndamento` | integer (int64) | não | Em andamento (todas) |
| `finalizadasMes` | integer (int64) | não | Finalizadas no mês atual |
| `abertasMes` | integer (int64) | não | Abertas no mês atual |
| `semAtendente` | integer (int64) | não | Em aberto sem atendente definida |

### TurmaRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `cursoId` | integer (int64) | sim |  |
| `nome` | string | sim | máx. 100 caracteres — ex.: `"2026-1 DS Noite"` |
| `unidade` | string | não | Padrão: SAO_CARLOS — valores: `SAO_CARLOS`, `DESCALVADO`, `PORTO_FERREIRA`, `SANTA_RITA_DO_PASSA_QUATRO` |
| `dataInicio` | string (date) | sim | ex.: `"2026-02-01"` |
| `dataPrevFim` | string (date) | sim | ex.: `"2027-12-15"` |
| `ativo` | boolean | não | Padrão: true |

### TurmaResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `nome` | string | não |  |
| `unidade` | string | não | valores: `SAO_CARLOS`, `DESCALVADO`, `PORTO_FERREIRA`, `SANTA_RITA_DO_PASSA_QUATRO` |
| `dataInicio` | string (date) | não |  |
| `dataPrevFim` | string (date) | não |  |
| `ativo` | boolean | não |  |
| `cursoId` | integer (int64) | não |  |
| `cursoNome` | string | não |  |
| `modalidade` | string | não | valores: `CST`, `CT`, `CAI` |

### UsuarioRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `nif` | string | sim | máx. 20 caracteres — ex.: `"123456"` |
| `nome` | string | sim | máx. 100 caracteres — ex.: `"Maria Souza"` |
| `email` | string (email) | não | máx. 150 caracteres — ex.: `"maria.souza@sp.senai.br"` |
| `senha` | string | sim | mín. 8 caracteres; máx. 72 caracteres — ex.: `"senhaForte123"` |
| `role` | string | sim | valores: `ADMINISTRADOR`, `OPERACIONAL`, `SOLICITANTE` |
| `cargo` | string | sim | valores: `SETOR_APOIO`, `PROFESSOR`, `COORDENADOR`, `BIBLIOTECARIO`, `SECRETARIA`, `OUTRO` |

### UsuarioResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `nif` | string | não |  |
| `nome` | string | não |  |
| `email` | string | não |  |
| `role` | string | não | valores: `ADMINISTRADOR`, `OPERACIONAL`, `SOLICITANTE` |
| `cargo` | string | não | valores: `SETOR_APOIO`, `PROFESSOR`, `COORDENADOR`, `BIBLIOTECARIO`, `SECRETARIA`, `OUTRO` |
| `ativo` | boolean | não |  |
| `createdAt` | string (date-time) | não |  |

### UsuarioResumo

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `nif` | string | não |  |
| `nome` | string | não |  |
| `cargo` | string | não | valores: `SETOR_APOIO`, `PROFESSOR`, `COORDENADOR`, `BIBLIOTECARIO`, `SECRETARIA`, `OUTRO` |

### UsuarioUpdateRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `nome` | string | sim | máx. 100 caracteres |
| `email` | string (email) | não | máx. 150 caracteres |
| `role` | string | sim | valores: `ADMINISTRADOR`, `OPERACIONAL`, `SOLICITANTE` |
| `cargo` | string | sim | valores: `SETOR_APOIO`, `PROFESSOR`, `COORDENADOR`, `BIBLIOTECARIO`, `SECRETARIA`, `OUTRO` |

### VincularUsuariosRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `usuarioIds` | integer (int64)[] | sim | mín. 1 item(ns) |

### VinculoRequest

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `matricula` | string | sim | máx. 20 caracteres — ex.: `"20260001"` |
| `turmaId` | integer (int64) | sim |  |
| `situacao` | string | não | Padrão: EM_ANDAMENTO — valores: `EM_ANDAMENTO`, `TRANCADO`, `CONCLUIDO`, `CANCELADO`, `EVADIDO` |

### VinculoResponse

| Campo | Tipo | Obrigatório | Regras / descrição |
|---|---|---|---|
| `id` | integer (int64) | não |  |
| `matricula` | string | não |  |
| `situacao` | string | não | valores: `EM_ANDAMENTO`, `TRANCADO`, `CONCLUIDO`, `CANCELADO`, `EVADIDO` |
| `turma` | [TurmaResponse](#turmaresponse) | não |  |
