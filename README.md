# Contatos

Agenda pessoal autenticada com cadastro, login, logout e contatos com nome e e-mail.

## Funcionalidades

- Cadastro de usuário e login por e-mail e senha.
- Lista de contatos protegida, separada por usuário.
- Adição, edição e exclusão de contatos com confirmação.
- Busca por nome/e-mail, sem distinguir acentos, e ordenação alfabética.
- Interface responsiva em português, formulários acessíveis e estados de erro/carregamento.
- Sessões de 7 dias em cookie HttpOnly/Secure/SameSite Strict, com revogação no logout.
- Senhas derivadas com scrypt, validação no servidor, consultas parametrizadas, proteção de origem e limitação de tentativas.

## Tecnologias

React, React Router e Vite no frontend; Express no backend; PostgreSQL para usuários, sessões e contatos. O Express também entrega o build do frontend, usando uma única origem. As credenciais do banco ficam apenas no ambiente do servidor.

## Desenvolvimento

Requisitos: Node.js 24 e PostgreSQL. Crie um banco vazio e configure sua conexão:

```sh
npm ci
cp .env.example .env
# Edite DATABASE_URL no .env
npm run dev:server
# Em outro terminal:
npm run dev
```

Abra o endereço exibido pelo Vite. A estrutura de tabelas é criada automaticamente ao iniciar o backend. Não há contas padrão nem contatos fictícios.

```sh
npm test
# Opcional: testes de interface (requer navegador Playwright)
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

Os testes de integração usam PostgreSQL em memória (pg-mem) e verificam autenticação, isolamento entre contas, CRUD, validações, revogação e expiração de sessão. Não acessam dados de produção.

## Render

O `render.yaml` cria um serviço web e um banco PostgreSQL na mesma região (Ohio), ambos no plano gratuito, com conexão interna ao banco e health check em `/api/health`. O deploy acompanha a branch `main`.

**Limitações do plano gratuito:** o serviço pode levar cerca de um minuto para iniciar após 15 minutos sem acesso; o PostgreSQL gratuito expira após 30 dias e exige upgrade para continuar disponível. Render remove o banco depois do período de tolerância de 14 dias. Faça upgrade e configure backups antes de usar com dados permanentes. Detalhes: https://render.com/docs/free.

Variáveis:

| Nome           | Uso                                                                                    |
| -------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Conexão PostgreSQL; obrigatória, apenas no servidor                                    |
| `NODE_ENV`     | `production` ativa cookies seguros, exige HTTPS                                        |
| `PORT`         | Porta HTTP, definida automaticamente pelo Render                                       |
| `APP_ORIGIN`   | Opcional; origem canônica para validação de requisições, caso haja proxy personalizado |

## API

Todas as rotas usam prefixo `/api`. Escritas recebem JSON. Os endpoints de contatos exigem o cookie de sessão.

| Método | Rota                  | Função                           |
| ------ | --------------------- | -------------------------------- |
| POST   | `/usuarios/registrar` | Cadastro: nome, email, senha     |
| POST   | `/usuarios/login`     | Login: email, senha              |
| POST   | `/usuarios/sair`      | Encerrar sessão                  |
| GET    | `/usuarios/me`        | Usuário autenticado              |
| GET    | `/contatos`           | Listar contatos do usuário       |
| POST   | `/contatos`           | Criar: nome, email               |
| PUT    | `/contatos/:id`       | Atualizar: nome, email           |
| DELETE | `/contatos/:id`       | Excluir contato próprio          |
| GET    | `/health`             | Prontidão do servidor e do banco |

Recuperação de senha por e-mail, importação de contatos e compartilhamento não fazem parte deste escopo.
