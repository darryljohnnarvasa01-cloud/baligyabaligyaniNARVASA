export default function StatCard({ label, value, helper, icon }) {
  return (
    <div className="rounded-[28px] border border-[#e0e0e0] bg-white p-6 shadow-[0_14px_32px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_18px_38px_rgba(0,0,0,0.1)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full bg-[#f5c842] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1a1a]">
            {label}
          </div>
          <div className="mt-4 text-3xl font-extrabold text-[#1a1a1a]">
            {value}
          </div>
        </div>
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-white">
            {icon}
          </div>
        ) : null}
      </div>
      {helper ? (
        <div className="mt-3 text-sm leading-6 text-[#666666]">{helper}</div>
      ) : null}
      <div className="mt-4 h-1 w-16 rounded-full bg-[#f5c842]" />
    </div>
  )
}
