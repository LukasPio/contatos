# Contatos — Atividade acadêmica

Aplicação web desenvolvida como **atividade da faculdade**, com foco na prática de desenvolvimento full stack, autenticação e persistência de dados. O sistema oferece uma agenda pessoal com cadastro, login e gerenciamento de contatos por usuário.

## Contexto acadêmico

O projeto utiliza um domínio de negócio enxuto — uma agenda de nomes e e-mails — para concentrar o aprendizado na integração entre interface, API e banco de dados. O escopo funcional é delimitado, enquanto a implementação contempla segurança de acesso, isolamento de dados, testes de integração e implantação em nuvem.

## Objetivos de aprendizagem

- **Desenvolvimento full stack:** integrar uma interface React a uma API Express e a um banco PostgreSQL.
- **Autenticação e autorização:** implementar sessões, proteção de rotas e acesso restrito aos dados de cada usuário.
- **Segurança da aplicação:** trabalhar com armazenamento seguro de senhas, validação de entradas e consultas parametrizadas.
- **Verificação de comportamento:** testar autenticação, operações de contatos e isolamento entre contas.
- **Implantação e configuração:** publicar a aplicação no Render, utilizando variáveis de ambiente, configuração versionada e verificação de saúde do serviço.

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

O escopo desta atividade acadêmica concentra-se em autenticação e gerenciamento individual de contatos. Recuperação de senha por e-mail, importação de contatos e compartilhamento são possibilidades de evolução, fora da entrega atual.
