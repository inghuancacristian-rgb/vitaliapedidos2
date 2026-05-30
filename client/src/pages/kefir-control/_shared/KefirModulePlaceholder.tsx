import KefirControlLayout from "../_shared/KefirControlLayout";

type PlaceholderProps = {
  title: string;
  subtitle: string;
};

export default function KefirModulePlaceholder({ title, subtitle }: PlaceholderProps) {
  return (
    <KefirControlLayout title={title} subtitle={subtitle}>
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
          <span className="text-4xl">🛠️</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-slate-500">{subtitle}. Este módulo está en proceso de desarrollo.</p>
      </div>
    </KefirControlLayout>
  );
}
