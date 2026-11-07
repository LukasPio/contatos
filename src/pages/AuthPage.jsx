import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  UsersRound,
  Mail,
} from "lucide-react";
import { api } from "../api";

export default function AuthPage({ register = false, onLogin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) {
        await api("/usuarios/registrar", { method: "POST", body: values });
        navigate("/login", {
          replace: true,
          state: { message: "Conta criada! Entre para começar sua agenda." },
        });
      } else {
        onLogin(await api("/usuarios/login", { method: "POST", body: values }));
        navigate("/contatos", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout" key={register ? "register" : "login"}>
      <section className="auth-story">
        <span className="eyebrow">
          <span className="tiny-dot" /> SIMPLES. PESSOAL. ORGANIZADO.
        </span>
        <h1>
          Boas conexões
          <br />
          merecem um
          <br />
          <span>lugar especial.</span>
        </h1>
        <p>
          Tenha os seus contatos sempre por perto.
          <br className="desktop-break" /> Uma agenda simples para quem faz
          parte do seu dia.
        </p>
        <div className="connection-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-center">
            <UsersRound size={35} />
          </div>
          <span className="art-avatar avatar-one">AM</span>
          <span className="art-avatar avatar-two">JP</span>
          <span className="art-avatar avatar-three">LC</span>
          <span className="art-mail">
            <Mail size={18} />
          </span>
          <span className="art-label">
            <span className="tiny-dot" /> Tudo em um só lugar
          </span>
        </div>
        <div className="story-note">
          <LockKeyhole size={16} />
          <span>Uma agenda só sua. Acesso protegido.</span>
        </div>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="card-heading-icon">
          <UsersRound size={22} />
        </div>
        <span className="eyebrow muted">SUA AGENDA PESSOAL</span>
        <h2 id="auth-title">
          {register ? "Vamos começar?" : "Que bom ter você aqui."}
        </h2>
        <p className="card-description">
          {register
            ? "Crie sua conta e dê um lugar às suas conexões."
            : "Entre na sua conta para acessar seus contatos."}
        </p>
        {!register && location.state?.message && (
          <div className="notice success" role="status">
            <Check size={17} />
            {location.state.message}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={submit} key={register ? "register" : "login"}>
          {register && (
            <label>
              Seu nome
              <input
                name="nome"
                autoComplete="name"
                placeholder="Como podemos chamar você?"
                required
                maxLength={100}
                disabled={busy}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              maxLength={254}
              disabled={busy}
            />
          </label>
          <label>
            Senha
            <span className="password-field">
              <input
                name="senha"
                type={showPassword ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "Crie uma senha segura" : "Digite sua senha"
                }
                required
                minLength={8}
                maxLength={128}
                disabled={busy}
              />
              <button
                type="button"
                className="icon-button password-toggle"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {register && (
            <p className="field-hint">Use pelo menos 8 caracteres.</p>
          )}
          <button className="button primary auth-submit" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                {register ? "Criando conta…" : "Entrando…"}
              </>
            ) : (
              <>
                {register ? "Criar minha conta" : "Entrar na minha agenda"}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link
            to={register ? "/login" : "/registrar"}
            onClick={() => setError("")}
          >
            {register ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
        <div className="card-bottom">
          <LockKeyhole size={13} /> Seus contatos ficam acessíveis apenas para
          você.
        </div>
      </section>
    </main>
  );
}
