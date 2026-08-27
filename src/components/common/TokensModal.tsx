import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";
import { Modal } from "./Modal";
import { TokenCell } from "./TokenCell";

const PAGE_SIZE = 40;

export function TokensModal({
  open,
  title,
  tokens,
  onClose,
}: {
  open: boolean;
  title: string;
  tokens: string[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setPage(0);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((token) => token.toLowerCase().includes(q));
  }, [tokens, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const allText = filtered.join("\n");

  return (
    <Modal open={open} title={title} onClose={onClose} wide zIndexClass="z-[70]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {filtered.length.toLocaleString("pt-BR")} token{filtered.length === 1 ? "" : "s"}
            {query.trim() ? " encontrados" : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Buscar token"
              className="rounded-lg border border-line bg-panel px-3 py-2 text-sm"
            />
            <CopyButton value={allText} label="Copiar todos" copiedLabel="Todos copiados" />
          </div>
        </div>
        {slice.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhum token neste recorte.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {slice.map((token) => (
              <li key={token} className="px-3 py-2">
                <TokenCell token={token} full />
              </li>
            ))}
          </ul>
        )}
        {filtered.length > PAGE_SIZE ? (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Página {currentPage + 1} de {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-line px-2 py-1 hover:bg-panel-2 disabled:opacity-30"
                disabled={currentPage <= 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="rounded-lg border border-line px-2 py-1 hover:bg-panel-2 disabled:opacity-30"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
