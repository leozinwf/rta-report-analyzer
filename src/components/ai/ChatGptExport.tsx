import { Bot, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useReport } from "../../context/ReportContext";
import { buildChatGptPackage } from "../../services/ai/chatGptPackage";

export function ChatGptExport() {
  const { filteredAnalysis, filteredExecutions } = useReport();
  const [copied, setCopied] = useState(false);
  if (!filteredAnalysis) return null;

  async function copyPackage() {
    const text = buildChatGptPackage(filteredAnalysis!, filteredExecutions);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="border-b border-line bg-cyan-50/60 px-6 py-3 dark:bg-cyan-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><Bot className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Analisar com ChatGPT</p>
            <p className="text-xs text-muted">Gera um pacote com o recorte atual, prioridades, anomalias, mensagens e tokens de exemplo. Nenhum dado é enviado automaticamente.</p>
          </div>
        </div>
        <button type="button" onClick={() => void copyPackage()} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Pacote copiado" : "Copiar para ChatGPT"}
        </button>
      </div>
    </div>
  );
}
