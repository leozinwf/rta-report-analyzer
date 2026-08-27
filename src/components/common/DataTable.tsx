import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  sortValue?: (row: T) => string | number;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  empty?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  pageSize = 25,
  onRowClick,
  empty = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = column.sortValue!(a);
      const vb = column.sortValue!(b);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const slice = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panel-2 text-[11px] uppercase tracking-[0.12em] text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 font-semibold ${column.align === "right" ? "text-right" : ""} ${column.sortValue ? "cursor-pointer select-none hover:text-ink" : ""}`}
                  onClick={column.sortValue ? () => toggleSort(column.key) : undefined}
                >
                  {column.header}
                  {sortKey === column.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                  {empty}
                </td>
              </tr>
            ) : (
              slice.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-t border-line/80 ${onRowClick ? "cursor-pointer hover:bg-panel-2/80" : "hover:bg-panel-2/40"}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 align-top ${column.align === "right" ? "text-right font-mono" : ""} ${column.className ?? ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
        <span>
          {sorted.length.toLocaleString("pt-BR")} registros
          {sorted.length ? ` · página ${currentPage + 1} de ${pageCount}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-line p-1 hover:bg-panel-2 disabled:opacity-30"
            disabled={currentPage <= 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-line p-1 hover:bg-panel-2 disabled:opacity-30"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((value) => value + 1)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
