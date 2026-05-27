export default function KefirControlPreviewHomePage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Preview temporal</p>
          <h1 className="mt-3 text-4xl font-black">KefirControl</h1>
          <p className="mt-2 text-slate-500">
            Espacio temporal para ordenar el módulo sin tocar la versión original.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <a className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100" href="/preview/kefir-control/inventory">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subruta</p>
              <p className="mt-2 text-lg font-bold">Inventario de Producción</p>
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100" href="/preview/kefir-control/kardex">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subruta</p>
              <p className="mt-2 text-lg font-bold">Kárdex de Planta</p>
            </a>
            <a className="rounded-2xl border border-slate-200 bg-slate-50 p-5 hover:bg-slate-100" href="/preview/kefir-control/lotes">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Subruta</p>
              <p className="mt-2 text-lg font-bold">Lotes</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
