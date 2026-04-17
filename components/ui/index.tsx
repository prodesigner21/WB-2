/**
 * components/ui/index.tsx
 * Shared UI primitives for the platform.
 */
'use client'
import { clsx } from 'clsx'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ─── STAT CARD ────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: React.ReactNode
  accent?: 'emerald' | 'gold' | 'red' | 'blue'
  className?: string
}

export function StatCard({ label, value, sub, trend, trendValue, icon, accent = 'emerald', className }: StatCardProps) {
  const accentColors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    gold: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  }

  return (
    <div className={clsx('stat-card group hover:border-white/10 transition-all duration-300', className)}>
      <div className="flex items-start justify-between">
        <p className="stat-label">{label}</p>
        {icon && (
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center border text-sm', accentColors[accent])}>
            {icon}
          </div>
        )}
      </div>
      <p className="stat-value mt-2 count-up">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {sub && <p className="stat-sub">{sub}</p>}
          {trend && trendValue && (
            <span className={clsx('flex items-center gap-1 text-xs font-medium', {
              'text-emerald-400': trend === 'up',
              'text-red-400': trend === 'down',
              'text-white/30': trend === 'neutral',
            })}>
              {trend === 'up' && <TrendingUp size={12} />}
              {trend === 'down' && <TrendingDown size={12} />}
              {trend === 'neutral' && <Minus size={12} />}
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── STATUS BADGE ──────────────────────────────────────────────────

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant, children, dot = true }: BadgeProps) {
  const classes: Record<BadgeVariant, string> = {
    green: 'badge-green',
    yellow: 'badge-yellow',
    red: 'badge-red',
    blue: 'badge-blue',
    gray: 'badge-gray',
  }
  const dotColors: Record<BadgeVariant, string> = {
    green: 'bg-emerald-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
    blue: 'bg-blue-400',
    gray: 'bg-white/30',
  }
  return (
    <span className={classes[variant]}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}

export function paymentStatusBadge(status: string) {
  if (status === 'approved' || status === 'paid') return <Badge variant="green">{status}</Badge>
  if (status === 'pending') return <Badge variant="yellow">{status}</Badge>
  if (status === 'rejected') return <Badge variant="red">{status}</Badge>
  return <Badge variant="gray">{status}</Badge>
}

// ─── LOADING SPINNER ──────────────────────────────────────────────

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={clsx('animate-spin text-emerald-400', className)} />
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-vault-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size={32} />
        <p className="text-white/30 text-sm">Loading...</p>
      </div>
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────────────

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={clsx('skeleton h-4 rounded', i === 0 ? 'w-1/3 h-3' : i === 1 ? 'w-full h-8' : 'w-2/3 h-3')} />
      ))}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="font-display font-bold text-xl text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative w-full card p-6 shadow-2xl animate-slide-up', maxWidth)}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────────

export function EmptyState({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 text-white/20">
        {icon}
      </div>
      <p className="text-white/60 font-medium">{title}</p>
      {description && <p className="text-white/30 text-sm mt-1">{description}</p>}
    </div>
  )
}

// ─── ALERT BANNER ─────────────────────────────────────────────────

type AlertVariant = 'warning' | 'error' | 'success' | 'info'

export function AlertBanner({ variant, children }: { variant: AlertVariant; children: React.ReactNode }) {
  const styles: Record<AlertVariant, string> = {
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
    error: 'bg-red-500/10 border-red-500/20 text-red-300',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
  }
  return (
    <div className={clsx('flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium', styles[variant])}>
      {children}
    </div>
  )
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, label, showLabel = true, color = 'emerald' }: {
  value: number
  max?: number
  label?: string
  showLabel?: boolean
  color?: 'emerald' | 'gold' | 'blue' | 'red'
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))
  const colorClasses = {
    emerald: 'bg-emerald-500',
    gold: 'bg-gold-400',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
  }
  return (
    <div>
      {(label || showLabel) && (
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white/40">{label}</span>
          <span className="text-white/60 font-medium">{percent.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full progress-bar', colorClasses[color])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
