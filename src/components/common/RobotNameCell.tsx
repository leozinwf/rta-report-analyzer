import { KeyRound } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { useReport } from "../../context/ReportContext";
import type { ClassifiedExecution } from "../../types";
import { TokensModal } from "./TokensModal";

export function RobotNameCell({
  name,
  compact = false,
  executionFilter,
}: {
  name: string;
  compact?: boolean;
  executionFilter?: (row: ClassifiedExecution) => boolean;
}) {
  const { filteredExecutions } = useReport();
  const [open, setOpen] = useState(false);
  const label = name || "N/D";

  const tokens = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of filteredExecutions) {
      if (row.robot !== name) continue;
      if (executionFilter && !executionFilter(row)) continue;
      if (!row.id || seen.has(row.id)) continue;
      seen.add(row.id);
      result.push(row.id);
    }
    return result;
  }, [filteredExecutions, name, executionFilter]);

  function stop(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? "" : "max-w-full"}`}>
      <span className={compact ? "" : "truncate"}>{label}</span>
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          setOpen(true);
        }}
        disabled={tokens.length === 0}
        title={tokens.length ? "Ver tokens deste robô" : "Nenhum token neste recorte"}
        aria-label={`Ver tokens de ${label}`}
        className="shrink-0 rounded-md border border-line p-1 text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-40"
      >
        <KeyRound className="size-3.5" />
      </button>
      <TokensModal
        open={open}
        title={`Tokens de ${label}`}
        tokens={tokens}
        onClose={() => setOpen(false)}
      />
    </span>
  );
}
