import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { copyToClipboard } from "../../utils/clipboard";

export function CopyButton({
  value,
  label = "Copiar",
  copiedLabel = "Copiado",
  compact = false,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  async function onCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={!value}
      title={copied ? copiedLabel : label}
      aria-label={copied ? copiedLabel : label}
      className={`inline-flex items-center gap-1 rounded-md border border-line bg-panel text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-40 ${
        compact ? "p-1" : "px-2 py-1 text-xs font-medium"
      }`}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {compact ? null : <span>{copied ? copiedLabel : label}</span>}
    </button>
  );
}
