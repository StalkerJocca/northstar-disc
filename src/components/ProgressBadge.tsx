type ProgressBadgeProps = {
  label: string
  value: string
}

function ProgressBadge({ label, value }: ProgressBadgeProps) {
  return (
    <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
      <span className="mr-2 text-[11px] uppercase tracking-[0.24em] text-stone-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

export default ProgressBadge
