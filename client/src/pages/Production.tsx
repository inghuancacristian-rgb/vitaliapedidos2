import { ExternalLink, FlaskConical } from "lucide-react";

export function Production() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Produccion Industrial</h1>
              <p className="text-sm text-slate-500">Modulo KefirControl integrado localmente</p>
            </div>
          </div>

          <a
            href="/kefir-control/index.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir en pantalla completa
          </a>
        </div>
      </div>

      <iframe
        title="KefirControl"
        src="/kefir-control/index.html"
        className="h-[calc(100vh-8.5rem)] w-full border-0 bg-white md:h-[calc(100vh-7rem)]"
      />
    </div>
  );
}
