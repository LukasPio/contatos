import { useEffect, useRef, useState } from "react";
import { X, UserRoundPlus, Trash2 } from "lucide-react";
import { api } from "../api";

export default function ContactDialog({
  contact,
  deleting,
  onClose,
  onSaved,
  onDeleted,
}) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (deleting) {
        await api(`/contatos/${contact.id}`, { method: "DELETE", body: {} });
        onDeleted(contact.id);
      } else {
        const body = Object.fromEntries(new FormData(event.currentTarget));
        const result = await api(
          contact ? `/contatos/${contact.id}` : "/contatos",
          { method: contact ? "PUT" : "POST", body },
        );
        onSaved(result);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="dialog-content">
        <button
          type="button"
          className="icon-button close-dialog"
          aria-label="Fechar"
          onClick={onClose}
          disabled={busy}
        >
          <X size={21} />
        </button>
        <div className={`card-heading-icon ${deleting ? "danger-icon" : ""}`}>
          {deleting ? <Trash2 size={23} /> : <UserRoundPlus size={23} />}
        </div>
        <h2 id="dialog-title">
          {deleting
            ? "Excluir contato?"
            : contact
              ? "Editar contato"
              : "Uma nova conexão"}
        </h2>
        <p className="card-description">
          {deleting ? (
            <>
              O contato <strong>{contact.nome}</strong> será excluído da sua
              agenda. Esta ação não pode ser desfeita.
            </>
          ) : (
            "Os detalhes que mantêm vocês por perto."
          )}
        </p>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={submit}>
          {!deleting && (
            <>
              <label>
                Nome
                <input
                  name="nome"
                  autoComplete="name"
                  defaultValue={contact?.nome || ""}
                  placeholder="Nome do contato"
                  required
                  maxLength={100}
                  disabled={busy}
                  autoFocus
                />
              </label>
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={contact?.email || ""}
                  placeholder="contato@exemplo.com"
                  required
                  maxLength={254}
                  disabled={busy}
                />
              </label>
            </>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={busy}
              autoFocus={deleting}
            >
              Cancelar
            </button>
            <button
              className={`button ${deleting ? "danger" : "primary"}`}
              disabled={busy}
            >
              {busy
                ? "Salvando…"
                : deleting
                  ? "Excluir contato"
                  : contact
                    ? "Salvar alterações"
                    : "Adicionar contato"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
