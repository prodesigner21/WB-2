/**
 * components/layout/Sidebar.tsx
 * Left navigation sidebar for authenticated users.
 */
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, History, FileText,
  MapPin, LogOut, Shield, TrendingUp, DoorOpen,
  Menu, X, ChevronRight, Wallet
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

const memberNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pay', label: 'Make Payment', icon: CreditCard },
  { href: '/history', label: 'History', icon: History },
  { href: '/statement', label: 'Statement', icon: FileText },
  { href: '/roadmap', label: 'Roadmap', icon: MapPin },
  { href: '/exit', label: 'Request Exit', icon: DoorOpen },
]

const adminNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin', label: 'Admin Panel', icon: Shield },
  { href: '/pay', label: 'Make Payment', icon: CreditCard },
  { href: '/history', label: 'History', icon: History },
  { href: '/statement', label: 'Statement', icon: FileText },
  { href: '/roadmap', label: 'Roadmap', icon: MapPin },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, logout, isAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = isAdmin ? adminNav : memberNav

  const NavItems = () => (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium',
              active
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <Icon size={18} className={active ? 'text-emerald-400' : 'text-white/30 group-hover:text-white/60'} />
            {label}
            {active && <ChevronRight size={14} className="ml-auto text-emerald-500/60" />}
          </Link>
        )
      })}
    </>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Wallet size={18} className="text-emerald-400" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-white leading-tight">Wealth Building</div>
            <div className="text-xs text-white/30">LLC Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {isAdmin && (
          <div className="mb-4">
            <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-2">Admin</p>
          </div>
        )}
        <NavItems />
      </nav>

      {/* User profile & logout */}
      <div className="px-4 py-6 border-t border-white/[0.06]">
        {profile && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-emerald-400">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{profile.name}</p>
                <p className="text-[10px] text-white/30 capitalize">
                  {profile.role} · {profile.sharePercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-200 text-sm"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-vault-950/90 backdrop-blur-md border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Wallet size={14} className="text-emerald-400" />
          </div>
          <span className="font-display font-bold text-sm text-white">WBL</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={clsx(
        'lg:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-vault-950 border-r border-white/[0.06] transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:fixed lg:inset-y-0 bg-vault-950 border-r border-white/[0.06]">
        <SidebarContent />
      </div>
    </>
  )
}
