import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-16 text-center">
      <Icon className="mb-4 size-8 text-muted" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
