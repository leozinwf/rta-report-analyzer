import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

const escapeStack: Array<() => void> = [];

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  zIndexClass = "z-50",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  zIndexClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    escapeStack.push(onClose);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (escapeStack[escapeStack.length - 1] !== onClose) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const index = escapeStack.lastIndexOf(onClose);
      if (index >= 0) escapeStack.splice(index, 1);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-start justify-center overflow-y-auto bg-slate-900/30 p-4 backdrop-blur-sm md:p-8`}>
      <div className={`relative mt-6 w-full rounded-2xl border border-line bg-panel shadow-2xl ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-panel-2 hover:text-ink"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
