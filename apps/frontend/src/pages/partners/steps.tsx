export function PartnerSteps({ step, labels }: { step: number; labels: [string, string, string] }) {
  return <ol aria-label="Etapas" className="my-5 grid grid-cols-3 gap-2 text-xs">{labels.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`rounded-lg p-3 ${step === index + 1 ? 'bg-yellow-100 font-semibold' : 'bg-slate-50'}`}>{index + 1}. {label}</li>)}</ol>;
}
