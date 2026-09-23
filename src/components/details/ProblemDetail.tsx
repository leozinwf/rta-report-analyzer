import { List } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS } from "../../data/labels";
import { useReport } from "../../context/ReportContext";
import type { ErrorAnalysis } from "../../types";
import { formatNumber, formatPercent } from "../../utils/format";
import { normalizeKey } from "../../utils/text";
import { CategoryBadge, EventTypeBadge, SeverityBadge } from "../common/Badge";
import { Modal } from "../common/Modal";
import { RobotNameCell } from "../common/RobotNameCell";
import { TokenCell } from "../common/TokenCell";
import { TokensModal } from "../common/TokensModal";

export function ProblemDetail({
  problem,
  onClose,
}: {
  problem: ErrorAnalysis | null;
  onClose: () => void;
}) {
  const { filteredExecutions } = useReport();
  const [tokensOpen, setTokensOpen] = useState(false);
  const problemMessage = problem?.message ?? "";
  const tokens = useMemo(() => {
    if (!problemMessage) return [];
    return [...new Set(
      filteredExecutions
        .filter((row) => normalizeKey(row.message) === normalizeKey(problemMessage))
        .map((row) => row.id)
        .filter(Boolean),
    )];
  }, [filteredExecutions, problemMessage]);

  return (
    <Modal open={Boolean(problem)} title={problem?.message || "Problema"} onClose={onClose} wide>
      {problem ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <CategoryBadge value={problem.category} />
            <SeverityBadge value={problem.severity} />
            <EventTypeBadge value={problem.eventType} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Info label="Ocorrências" value={formatNumber(problem.count)} />
            <Info label="Percentual" value={formatPercent(problem.percent)} />
            <Info label="Categoria" value={CATEGORY_LABELS[problem.category]} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Impacto</h3>
            <p className="text-sm text-muted">
              {formatNumber(problem.robotCount)} robôs afetados · {formatNumber(problem.tenantCount)} tenants afetados · {formatNumber(problem.environmentCount)} ambientes
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Robôs afetados</h3>
            <div className="flex flex-wrap gap-2">
              {problem.robots.map((robot) => (
                <span key={robot} className="inline-flex items-center rounded-md bg-panel-2 px-2 py-1 text-xs">
                  <RobotNameCell
                    name={robot}
                    compact
                    executionFilter={(row) => normalizeKey(row.message) === normalizeKey(problem.message)}
                  />
                </span>
              ))}
            </div>
          </div>
          {problem.sampleIds.length ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">Tokens de exemplo</h3>
                  <p className="mt-0.5 text-xs text-muted">{tokens.length.toLocaleString("pt-BR")} tokens encontrados para este problema</p>
                </div>
                {tokens.length > problem.sampleIds.length ? (
                  <button type="button" onClick={() => setTokensOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:bg-panel-2">
                    <List className="size-3.5" /> Ver todos
                  </button>
                ) : null}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {problem.sampleIds.map((token) => (
                  <li key={token} className="min-w-0 rounded-lg border border-line bg-panel-2 px-3 py-2">
                    <TokenCell token={token} full />
                  </li>
                ))}
              </ul>
              <TokensModal open={tokensOpen} title={`Tokens · ${problem.message}`} tokens={tokens} onClose={() => setTokensOpen(false)} />
            </div>
          ) : null}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Mensagens relacionadas</h3>
            <ul className="space-y-1 text-sm">
              {problem.relatedMessages.map((item) => (
                <li key={item.message} className="flex justify-between gap-4">
                  <span className="text-ink">{item.message || "N/D"}</span>
                  <span className="font-mono text-muted">{formatNumber(item.count)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Distribuição por ambiente</h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(problem.environments).map(([env, count]) => (
                  <li key={env} className="flex justify-between">
                    <span className="uppercase">{env}</span>
                    <span className="font-mono">{formatNumber(count)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Distribuição por tentativa</h3>
              <ul className="space-y-1 text-sm">
                {Object.entries(problem.attemptDistribution).map(([attempt, count]) => (
                  <li key={attempt} className="flex justify-between">
                    <span>Tentativa {attempt}</span>
                    <span className="font-mono">{formatNumber(count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel-2 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
