import { LockKeyhole, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

function safeDestination(): string {
  const value = new URLSearchParams(window.location.search).get("next") ?? "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      window.location.replace(safeDestination());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-line bg-panel p-8 shadow-xl shadow-slate-200/60">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-accent">
          <ShieldCheck className="size-6" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Acesso protegido</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">RTA Report Analyzer</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Informe a senha interna para acessar relatórios e integrações operacionais.
        </p>

        <form onSubmit={(event) => void submit(event)} className="mt-7 space-y-4">
          <label className="block text-sm font-medium">
            Senha de acesso
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-3 outline-none focus:border-accent"
              />
            </span>
          </label>

          {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? "Validando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
