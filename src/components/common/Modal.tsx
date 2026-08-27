import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm md:p-8">
      <div className={`relative mt-6 w-full rounded-2xl border border-line bg-ink shadow-2xl ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-panel-2 hover:text-white"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
