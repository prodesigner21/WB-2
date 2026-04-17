/**
 * app/(dashboard)/roadmap/page.tsx
 * Roadmap showing milestones with progress bars.
 */
'use client'
import { useState, useEffect } from 'react'
import { getMilestones } from '@/lib/firestore'
import { SectionHeader, ProgressBar, Badge, EmptyState, Spinner } from '@/components/ui'
import { MapPin, Target, CheckCircle, Clock } from 'lucide-react'
import { formatCurrency } from '@/utils/calculations'
import type { Milestone } from '@/lib/types'

export default function RoadmapPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMilestones().then(m => {
      setMilestones(m)
      setLoading(false)
    })
  }, [])

  const completed = milestones.filter(m => m.status === 'completed').length
  const total = milestones.length
  const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <SectionHeader
        title="Investment Roadmap"
        subtitle="Track our shared milestones and progress toward financial goals."
      />

      {/* ── Overall progress ─────────────────────────── */}
      {!loading && milestones.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Overall Progress</h3>
              <p className="text-sm text-white/40">{completed} of {total} milestones completed</p>
            </div>
            <div className="text-3xl font-display font-bold text-emerald-400">{overallProgress}%</div>
          </div>
          <ProgressBar value={completed} max={total} showLabel={false} />
        </div>
      )}

      {/* ── Milestone list ───────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : milestones.length === 0 ? (
        <div className="card p-8">
          <EmptyState
            icon={<MapPin size={24} />}
            title="No milestones yet"
            description="Your admin will add investment milestones soon."
          />
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-6 bottom-6 w-px bg-white/[0.06] hidden sm:block" />

          <div className="space-y-4">
            {milestones.map((m, i) => {
              const statusConfig = {
                completed: { badge: <Badge variant="green">Completed</Badge>, icon: <CheckCircle size={20} className="text-emerald-400" />, border: 'border-emerald-500/20' },
                in_progress: { badge: <Badge variant="yellow">In Progress</Badge>, icon: <Clock size={20} className="text-yellow-400" />, border: 'border-yellow-500/20' },
                upcoming: { badge: <Badge variant="gray">Upcoming</Badge>, icon: <Target size={20} className="text-white/30" />, border: 'border-white/[0.08]' },
              }
              const config = statusConfig[m.status] || statusConfig.upcoming

              return (
                <div key={m.id} className="flex gap-4 sm:gap-6">
                  {/* Timeline dot */}
                  <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border bg-vault-800 ${config.border}`}>
                      {config.icon}
                    </div>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 card p-5 border ${config.border} transition-all duration-300`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-semibold text-white">{m.title}</h3>
                          {config.badge}
                        </div>
                        <p className="text-sm text-white/50">{m.description}</p>
                      </div>
                      {m.targetAmount > 0 && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-white/30">Target</p>
                          <p className="text-sm font-bold text-gold-400">{formatCurrency(m.targetAmount)}</p>
                        </div>
                      )}
                    </div>

                    <ProgressBar
                      value={m.progress}
                      max={100}
                      color={m.status === 'completed' ? 'emerald' : m.status === 'in_progress' ? 'gold' : 'blue'}
                    />

                    {m.targetDate && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-white/30">
                        <Clock size={12} />
                        Target: {new Date(m.targetDate).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
