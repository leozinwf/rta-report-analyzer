import { ExternalLink, Eye } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { tokenUrl } from "../../utils/tokenUrl";
import { CopyButton } from "./CopyButton";
import { Modal } from "./Modal";

function truncateToken(token: string, max = 18): string {
  if (!token) return "N/D";
  if (token.length <= max) return token;
  return `${token.slice(0, max)}…`;
}

export function TokenCell({ token, full = false }: { token: string; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const value = token || "";
  const url = tokenUrl(value);

  function stopRow(event: MouseEvent) { event.stopPropagation(); }

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 ${full ? "" : "whitespace-nowrap"}`} onClick={stopRow}>
      <span className={`font-mono text-xs ${full ? "break-all" : "max-w-[140px] truncate"}`} title={value || undefined}>
        {full ? value || "N/D" : truncateToken(value)}
      </span>
      {value ? <>
        {full ? null : <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }} title="Ver token completo" aria-label="Ver token completo" className="rounded-md border border-line p-1 text-muted hover:bg-panel-2 hover:text-ink"><Eye className="size-3.5" /></button>}
        <CopyButton value={value} label="Copiar token" compact />
        {url ? <a href={url} target="_blank" rel="noreferrer" onClick={stopRow} title={/^A-/i.test(value) ? "Abrir token no Automation" : "Abrir token no RTA"} aria-label="Abrir token" className="inline-flex rounded-md border border-line p-1 text-muted hover:bg-panel-2 hover:text-accent"><ExternalLink className="size-3.5" /></a> : null}
      </> : null}
      <Modal open={open} title="Token" onClose={() => setOpen(false)} zIndexClass="z-[80]">
        <div className="space-y-4"><p className="break-all rounded-xl bg-panel-2 px-3 py-3 font-mono text-sm">{value}</p><div className="flex flex-wrap gap-2"><CopyButton value={value} label="Copiar token completo" />{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-panel-2"><ExternalLink className="size-4"/>Abrir token</a> : null}</div></div>
      </Modal>
    </span>
  );
}
