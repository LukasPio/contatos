import { test, expect } from "@playwright/test";

test("cadastro, login, CRUD, busca, atualização da página e logout no navegador", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/contatos");
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: "/tmp/contatos-login.png", fullPage: true });
  await page.getByRole("link", { name: "Cadastre-se" }).click();
  await page.getByLabel("Seu nome").fill("Teste da Interface");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("interface@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Senha-teste-123");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("status")).toContainText("Conta criada!");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("interface@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("Senha-teste-123");
  await page.getByRole("button", { name: "Entrar na minha agenda" }).click();
  await expect(
    page.getByRole("heading", { name: "Minha agenda." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar contato", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill("João da Silva");
  await page
    .getByRole("dialog")
    .getByLabel("E-mail", { exact: true })
    .fill("joao@example.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Adicionar contato", exact: true })
    .click();
  await expect(page.getByText("João da Silva", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("João da Silva", { exact: true })).toBeVisible();
  await page.getByRole("searchbox").fill("joao");
  await expect(page.getByText("João da Silva", { exact: true })).toBeVisible();
  await page.getByRole("searchbox").fill("inexistente");
  await expect(page.getByText("Nenhum contato encontrado")).toBeVisible();
  await page
    .getByRole("button", { name: "Limpar busca", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Editar João da Silva" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill("João Atualizado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByText("João Atualizado", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/contatos-agenda.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/contatos-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Excluir João Atualizado" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(
    page.getByText("João Atualizado", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Excluir João Atualizado" }).click();
  await page
    .getByRole("button", { name: "Excluir contato", exact: true })
    .click();
  await expect(page.getByText("Sua próxima conexão começa aqui")).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/contatos");
  await expect(page).toHaveURL(/\/login$/);
  expect(errors).toEqual([]);
});
