import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, FileImage, ReceiptText } from 'lucide-react'
import DeliveryCard from '../../components/rider/DeliveryCard'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import { useRiderHistory, useRiderSummary } from '../../hooks/rider/useRiderOrders'
import { normalizePublicAssetUrl } from '../../utils/storefront'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function StatCard({ label, value, detail, icon }) {
  return (
    <div className="rounded-[24px] border border-[#e7dcc8] bg-[linear-gradient(180deg,#fffdfa_0%,#ffffff_100%)] p-4 shadow-[0_18px_40px_rgba(26,25,22,0.08)] sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-4">{label}</div>
          <div className="mt-3 text-[2rem] font-display font-bold italic text-ink sm:text-4xl">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#eadbbc] bg-[#fff5dc] text-ember">
          {icon}
        </div>
      </div>
      <div className="mt-3 text-sm leading-6 text-ink-3">{detail}</div>
    </div>
  )
}

export default function RiderHistoryPage() {
  const historyQuery = useRiderHistory()
  const summaryQuery = useRiderSummary()

  const history = historyQuery.data ?? []
  const summary = summaryQuery.data ?? null

  return (
    <div className="space-y-6 animate-fade-up sm:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[#e7dcc5] bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(194,98,26,0.08),transparent_30%),linear-gradient(180deg,#fffdf8_0%,#f7f0e4_100%)] p-5 shadow-[0_24px_60px_rgba(26,25,22,0.08)] sm:rounded-[36px] sm:p-7">
        <div className="absolute left-0 top-0 h-28 w-28 -translate-x-6 -translate-y-5 rounded-full bg-[rgba(201,168,76,0.14)] blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#e2d4b7] bg-white/82 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-ink-3 shadow-xs">
              Rider Archive
            </div>
            <h1 className="mt-4 text-[2.8rem] font-display font-bold italic leading-none text-ink sm:text-[4.2rem]">
              Delivery History
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-3 sm:text-[15px]">
              Review completed stops, reopen proof-of-delivery images, and keep a clean record of what you finished today and across your full rider run.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex w-full items-center justify-center rounded-full border border-[#e5d8c0] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-ink-3 shadow-xs sm:w-auto">
                Completed proof archive
              </span>
              <Link
                to="/rider/deliveries"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#d5c191] bg-[#fff0c7] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink shadow-xs transition hover:-translate-y-0.5 hover:bg-[#ffe7a6] sm:w-auto"
              >
                Back to live board
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="w-full max-w-[360px] flex-1">
            <div className="rounded-[24px] border border-[#e6dbc8] bg-white/82 p-4 shadow-[0_16px_34px_rgba(26,25,22,0.08)] backdrop-blur sm:rounded-[26px] sm:p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-ink-4">History board</div>
              <div className="mt-2 text-[1.65rem] font-display font-bold italic leading-none text-ink sm:text-[2rem]">
                {summaryQuery.isFetching || historyQuery.isFetching
                  ? 'Refreshing archive'
                  : history.length > 0
                    ? 'Proofs ready to review'
                    : 'No completed stops yet'}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-3">
                {history.length > 0
                  ? 'Open any completed card below to inspect proof images and revisit delivery details.'
                  : 'Delivered orders will appear here automatically once your active run is completed.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryQuery.isLoading || !summary ? (
          <div className="flex items-center justify-center py-10 md:col-span-3">
            <Spinner className="h-12 w-12" />
          </div>
        ) : (
          <>
            <StatCard
              label="Delivered today"
              value={summary.delivered_today}
              detail="Completed runs stamped today across your rider activity."
              icon={<Clock3 className="h-5 w-5" />}
            />
            <StatCard
              label="Delivered total"
              value={summary.delivered_total}
              detail="All completed stops currently recorded under your rider account."
              icon={<ReceiptText className="h-5 w-5" />}
            />
            <StatCard
              label="Estimated payout total"
              value={formatCurrency(summary.estimated_earnings_total)}
              detail="Running payout estimate across all completed deliveries."
              icon={<FileImage className="h-5 w-5" />}
            />
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-ink-3">Completed deliveries</div>
          <h2 className="mt-2 text-2xl font-display font-bold italic text-ink">Review finished stops</h2>
          <p className="mt-2 text-sm text-ink-3">
            Use the delivery detail page to reopen proof, timestamps, and handoff context.
          </p>
        </div>

        {historyQuery.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner className="h-12 w-12" />
          </div>
        ) : historyQuery.isError ? (
          <ErrorState
            title="Unable to load delivery history."
            onAction={() => historyQuery.refetch()}
          />
        ) : history.length === 0 ? (
          <EmptyState
            title="No completed deliveries yet."
            description="Delivered orders will appear here once you finish them."
            titleClassName="italic"
          />
        ) : (
          <div className="grid gap-4">
            {history.map((order, idx) => (
              <div
                key={order.id}
                className="animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <DeliveryCard
                  order={order}
                  actions={
                    <>
                      <Link
                        to={`/rider/deliveries/${order.id}`}
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] border border-live/60 px-4 py-2 text-sm font-medium text-live transition hover:bg-live-l sm:w-auto"
                      >
                        Review delivery
                      </Link>
                      {(() => {
                        const proofUrl = normalizePublicAssetUrl(order.delivery_proof_url)

                        if (!proofUrl) {
                          return null
                        }

                        return (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[8px] border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-surface sm:w-auto"
                          >
                            Open proof
                          </a>
                        )
                      })()}
                    </>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
