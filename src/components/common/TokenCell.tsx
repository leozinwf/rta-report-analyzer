import { Eye } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { CopyButton } from "./CopyButton";
import { Modal } from "./Modal";

function truncateToken(token: string, max = 18): string {
  if (!token) return "N/D";
  if (token.length <= max) return token;
  return `${token.slice(0, max)}…`;
}

export function TokenCell({
  token,
  full = false,
}: {
  token: string;
  full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const value = token || "";

  function stopRow(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 ${full ? "" : "whitespace-nowrap"}`} onClick={stopRow}>
      <span
        className={`font-mono text-xs ${full ? "break-all" : "max-w-[140px] truncate"}`}
        title={value || undefined}
      >
        {full ? value || "N/D" : truncateToken(value)}
      </span>
      {value ? (
        <>
          {full ? null : (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(true);
              }}
              title="Ver token completo"
              aria-label="Ver token completo"
              className="rounded-md border border-line p-1 text-muted hover:bg-panel-2 hover:text-ink"
            >
              <Eye className="size-3.5" />
            </button>
          )}
          <CopyButton value={value} label="Copiar token" compact />
        </>
      ) : null}
      <Modal open={open} title="Token" onClose={() => setOpen(false)} zIndexClass="z-[80]">
        <div className="space-y-4">
          <p className="break-all rounded-xl bg-panel-2 px-3 py-3 font-mono text-sm">{value}</p>
          <CopyButton value={value} label="Copiar token completo" />
        </div>
      </Modal>
    </span>
  );
}
