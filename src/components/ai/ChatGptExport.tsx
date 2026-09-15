import { Bot, Check, Copy, Eye, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useReport } from "../../context/ReportContext";
import { buildChatGptPackage } from "../../services/ai/chatGptPackage";

export function ChatGptExport() {
  const { filteredAnalysis, filteredExecutions } = useReport();
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const text = useMemo(() => filteredAnalysis ? buildChatGptPackage(filteredAnalysis, filteredExecutions) : "", [filteredAnalysis, filteredExecutions]);
  if (!filteredAnalysis) return null;

  async function copyPackage() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      <div className="border-b border-line bg-cyan-50/60 px-6 py-3 dark:bg-cyan-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><Bot className="size-5" /></span>
            <div>
              <p className="text-sm font-semibold text-ink">Analisar com ChatGPT · Pacote v2</p>
              <p className="text-xs text-muted">Inclui contexto por robô/Type, sistema, taxa de falha, fornecedor/template, retries e tokens. Nenhum dado é enviado automaticamente.</p>
              <p className="mt-0.5 text-[11px] text-muted">{filteredExecutions.length.toLocaleString("pt-BR")} execuções no recorte · pacote com {text.length.toLocaleString("pt-BR")} caracteres</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink hover:bg-panel-2">
              <Eye className="size-4" /> Visualizar pacote
            </button>
            <button type="button" onClick={() => void copyPackage()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Pacote copiado" : "Copiar para ChatGPT"}
            </button>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-line bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-semibold text-ink">Pacote para ChatGPT · v2</p>
                <p className="text-xs text-muted">Confira exatamente o conteúdo que será copiado.</p>
              </div>
              <button type="button" onClick={() => setPreview(false)} className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-ink" aria-label="Fechar"><X className="size-5" /></button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{text}</pre>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <span className="text-xs text-muted">{text.length.toLocaleString("pt-BR")} caracteres</span>
              <button type="button" onClick={() => void copyPackage()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar pacote"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
