import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  ArrowUpDown,
  Mail,
  Pencil,
  Trash2,
  UsersRound,
  X,
  Check,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { api } from "../api";
import ContactDialog from "../components/ContactDialog";

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [reverse, setReverse] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [notice, setNotice] = useState("");
  async function load(signal) {
    setLoading(true);
    setError("");
    try {
      setContacts(await api("/contatos", { signal }));
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const filtered = useMemo(
    () =>
      contacts
        .filter((c) =>
          normalize(`${c.nome} ${c.email}`).includes(normalize(query.trim())),
        )
        .sort(
          (a, b) => (reverse ? -1 : 1) * a.nome.localeCompare(b.nome, "pt-BR"),
        ),
    [contacts, query, reverse],
  );
  function saved(contact) {
    setContacts((current) => [
      ...current.filter((c) => c.id !== contact.id),
      contact,
    ]);
    setNotice(
      dialog.contact
        ? "Contato atualizado."
        : "Contato adicionado à sua agenda.",
    );
    setDialog(null);
  }
  function deleted(id) {
    setContacts((current) => current.filter((c) => c.id !== id));
    setNotice("Contato excluído.");
    setDialog(null);
  }

  return (
    <main className="contacts-main">
      <section className="page-heading">
        <div>
          <span className="eyebrow muted">SUAS CONEXÕES, BEM CUIDADAS</span>
          <h1>
            Minha agenda<span className="brand-dot">.</span>
          </h1>
          <p>Gente importante, sempre por perto.</p>
        </div>
        <button className="button primary" onClick={() => setDialog({})}>
          <Plus size={18} />
          Adicionar contato
        </button>
      </section>
      <section className="agenda" aria-label="Seus contatos">
        <div className="agenda-top">
          <div className="list-title">
            <UsersRound size={19} />
            <h2>Todos os contatos</h2>
            <span className="count">{contacts.length}</span>
          </div>
          <span className="private-label">Sua agenda pessoal</span>
        </div>
        <div className="list-toolbar">
          <div className="search-field">
            <Search size={18} />
            <input
              type="search"
              aria-label="Buscar contatos por nome ou e-mail"
              placeholder="Buscar por nome ou e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Limpar busca"
                onClick={() => setQuery("")}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className="sort-button"
            onClick={() => setReverse(!reverse)}
            aria-label={`Ordenar de ${reverse ? "A a Z" : "Z a A"}`}
          >
            <ArrowUpDown size={16} />
            <span>{reverse ? "Z — A" : "A — Z"}</span>
          </button>
        </div>
        {loading ? (
          <div className="empty-state" role="status">
            <span className="spinner" />
            <p>Carregando seus contatos…</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p className="error-text" role="alert">
              {error}
            </p>
            <button className="button secondary" onClick={() => load()}>
              <RefreshCw size={17} />
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              {query ? <Search size={32} /> : <UsersRound size={36} />}
            </div>
            <h3>
              {query
                ? "Nenhum contato encontrado"
                : "Sua próxima conexão começa aqui"}
            </h3>
            <p>
              {query
                ? "Tente outro nome ou e-mail para encontrar quem procura."
                : "Adicione seu primeiro contato e comece a organizar sua agenda."}
            </p>
            <button
              className="button secondary"
              onClick={() => (query ? setQuery("") : setDialog({}))}
            >
              {query ? (
                "Limpar busca"
              ) : (
                <>
                  <Plus size={17} />
                  Adicionar primeiro contato
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="table-head">
              <span>NOME</span>
              <span>E-MAIL</span>
              <span>AÇÕES</span>
            </div>
            <ul className="contact-list">
              {filtered.map((contact) => (
                <li className="contact-row" key={contact.id}>
                  <div className="contact-person">
                    <span
                      className={`avatar tone-${contact.nome.codePointAt(0) % 4}`}
                    >
                      {initials(contact.nome)}
                    </span>
                    <span className="contact-name">{contact.nome}</span>
                  </div>
                  <a className="contact-email" href={`mailto:${contact.email}`}>
                    <Mail size={15} />
                    <span>{contact.email}</span>
                    <ArrowUpRight className="email-arrow" size={14} />
                  </a>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${contact.nome}`}
                      title="Editar contato"
                      onClick={() => setDialog({ contact })}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button delete-button"
                      aria-label={`Excluir ${contact.nome}`}
                      title="Excluir contato"
                      onClick={() => setDialog({ contact, deleting: true })}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="list-footer">
              {query
                ? `${filtered.length} de ${contacts.length}`
                : contacts.length}{" "}
              {filtered.length === 1 ? "contato" : "contatos"}
              <span>Um espaço para as suas conexões.</span>
            </div>
          </>
        )}
      </section>
      <p className="agenda-note">
        <span className="tiny-dot" /> Cada contato é uma conexão que vale
        guardar.
      </p>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            className="icon-button"
            aria-label="Fechar aviso"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <ContactDialog
          {...dialog}
          onClose={() => setDialog(null)}
          onSaved={saved}
          onDeleted={deleted}
        />
      )}
    </main>
  );
}
