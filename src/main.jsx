import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import { ContactRound, LogOut, ArrowUpRight } from "lucide-react";
import { api } from "./api";
import AuthPage from "./pages/AuthPage";
import ContactsPage from "./pages/ContactsPage";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./styles.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  async function restore() {
    setLoading(true);
    setError("");
    try {
      setUser(await api("/usuarios/me"));
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    restore();
    const expired = () => {
      setUser(null);
      navigate("/login", {
        state: { message: "Sua sessão expirou. Entre novamente." },
      });
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []); // Restore once on mount; API authorization remains authoritative.

  async function logout() {
    setLoggingOut(true);
    try {
      await api("/usuarios/sair", { method: "POST", body: {} });
      setUser(null);
      navigate("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link
            className="brand"
            to={user ? "/contatos" : "/login"}
            aria-label="Contatos, início"
          >
            <span className="brand-icon">
              <ContactRound size={22} />
            </span>
            contatos<span className="brand-dot">.</span>
          </Link>
          {user ? (
            <div className="user-nav">
              <span className="user-name">Olá, {user.nome.split(" ")[0]}</span>
              <span className="nav-divider" />
              <button
                className="text-button"
                onClick={logout}
                disabled={loggingOut}
              >
                <LogOut size={16} />
                {loggingOut ? "Saindo…" : "Sair"}
              </button>
            </div>
          ) : (
            <Link className="header-link" to="/registrar">
              Criar uma conta <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </header>
      {error && !loading && (
        <div className="global-error" role="alert">
          {error}{" "}
          <button className="text-button" onClick={restore}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading ? (
        <main className="loading-page" role="status">
          <span className="spinner" />
          Preparando sua agenda…
        </main>
      ) : error && !user ? (
        <main className="loading-page">
          Não foi possível conectar à sua agenda.
        </main>
      ) : (
        <Routes>
          <Route
            path="/"
            element={<Navigate to={user ? "/contatos" : "/login"} replace />}
          />
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/contatos" replace />
              ) : (
                <AuthPage onLogin={setUser} />
              )
            }
          />
          <Route
            path="/registrar"
            element={
              user ? (
                <Navigate to="/contatos" replace />
              ) : (
                <AuthPage register onLogin={setUser} />
              )
            }
          />
          <Route
            path="/contatos"
            element={user ? <ContactsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="*"
            element={
              <main className="not-found">
                <h1>Página não encontrada</h1>
                <p>Vamos voltar para a sua agenda?</p>
                <Link className="button primary" to="/">
                  Voltar ao início
                </Link>
              </main>
            }
          />
        </Routes>
      )}
      <footer className="footer">
        <span>Contatos. Conexões que ficam.</span>
        <span>Sua agenda, do seu jeito.</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
