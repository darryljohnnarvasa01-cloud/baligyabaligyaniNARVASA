import NotificationBell from './NotificationBell'

export default function Topbar({ title, subtitle, right }) {
  return (
    <div className="first-light-dark-shell rounded-[30px] px-5 py-5 text-white sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f5c842]">
            DISKR3T Admin
          </div>
          <div className="mt-2 text-[1.8rem] font-extrabold leading-none sm:text-[2rem]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-3 max-w-[44rem] text-sm leading-7 text-white/66">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <NotificationBell />
          {right}
        </div>
      </div>
    </div>
  )
}
