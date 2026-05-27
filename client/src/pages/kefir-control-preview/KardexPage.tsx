export default function KefirControlPreviewKardexPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Preview temporal</p>
        <h1 className="mt-3 text-3xl font-black">Kárdex de Planta</h1>
        <p className="mt-2 text-slate-500">
          Si ves esta pantalla, el preview ya está funcionando y podemos ordenar la UI por partes.
        </p>
        <a className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white" href="/preview/kefir-control">
          Volver al preview
        </a>
      </div>
    </div>
  );
}
