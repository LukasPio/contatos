export async function api(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      signal,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
    );
  }
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      data?.erro ||
        "O servidor está indisponível. Tente novamente em instantes.",
    );
    error.status = response.status;
    if (response.status === 401 && !path.includes("/usuarios/"))
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  return data;
}
