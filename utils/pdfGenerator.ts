/**
 * utils/pdfGenerator.ts
 * Generates downloadable financial statements using jsPDF + autoTable.
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatMonth } from './calculations'
import type { UserProfile, Contribution, Payment, MemberMonth } from '@/lib/types'

export async function generateFinancialStatement(params: {
  user: UserProfile
  contributions: Contribution[]
  payments: Payment[]
  memberMonths: MemberMonth[]
  totalContributions: number
  profitShare: number
  netBalance: number
}): Promise<void> {
  const { user, contributions, payments, memberMonths, totalContributions, profitShare, netBalance } = params
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const DARK: [number, number, number] = [10, 16, 32]       // vault-800
  const GREEN: [number, number, number] = [16, 185, 129]    // emerald-500
  const GOLD: [number, number, number] = [251, 191, 36]     // gold-400
  const LIGHT: [number, number, number] = [255, 255, 255]
  const MUTED: [number, number, number] = [120, 130, 150]

  const W = doc.internal.pageSize.getWidth()

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...DARK as [number, number, number])
  doc.rect(0, 0, W, 40, 'F')

  doc.setTextColor(...GREEN as [number, number, number])
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('WEALTH BUILDING LLC', 14, 16)

  doc.setTextColor(...GOLD as [number, number, number])
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('MEMBER FINANCIAL STATEMENT', 14, 24)

  doc.setTextColor(...MUTED as [number, number, number])
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)
  doc.text(`Reference: WBL-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`, W - 14, 32, { align: 'right' })

  // ── Member Info ───────────────────────────────────────────────
  doc.setTextColor(...DARK as [number, number, number])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('MEMBER DETAILS', 14, 52)

  const infoRows = [
    ['Full Name', user.name],
    ['Email', user.email],
    ['Phone', user.phone],
    ['Ownership Share', `${user.sharePercent.toFixed(2)}%`],
    ['Member Since', formatMonth(user.joinedMonth)],
  ]

  autoTable(doc, {
    startY: 56,
    head: [],
    body: infoRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: MUTED },
      1: { textColor: DARK },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Financial Summary ─────────────────────────────────────────
  const afterInfo = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK as [number, number, number])
  doc.text('FINANCIAL SUMMARY', 14, afterInfo)

  const summaryRows = [
    ['Total Contributions', formatCurrency(totalContributions)],
    ['Profit Share (estimated)', formatCurrency(profitShare)],
    ['Total Value', formatCurrency(totalContributions + profitShare)],
  ]

  autoTable(doc, {
    startY: afterInfo + 4,
    head: [['Item', 'Amount']],
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillColor: DARK, textColor: GREEN, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Month Status ──────────────────────────────────────────────
  const afterSummary = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('MONTH-BY-MONTH STATUS', 14, afterSummary)

  const monthRows = memberMonths.map(m => [
    formatMonth(m.month),
    m.status.toUpperCase(),
  ])

  autoTable(doc, {
    startY: afterSummary + 4,
    head: [['Month', 'Status']],
    body: monthRows,
    theme: 'striped',
    headStyles: { fillColor: DARK, textColor: GREEN, fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
    bodyStyles: {
      textColor: DARK,
    },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const val = data.cell.raw as string
        if (val === 'PAID') data.cell.styles.textColor = [16, 185, 129] as [number, number, number]
        else if (val === 'PENDING') data.cell.styles.textColor = [251, 191, 36] as [number, number, number]
        else data.cell.styles.textColor = [239, 68, 68] as [number, number, number]
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Transaction History ───────────────────────────────────────
  const afterMonths = (doc as any).lastAutoTable.finalY + 8
  doc.addPage()
  doc.setFillColor(...DARK as [number, number, number])
  doc.rect(0, 0, W, 12, 'F')
  doc.setTextColor(...GREEN as [number, number, number])
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('WEALTH BUILDING LLC — TRANSACTION HISTORY', W / 2, 8, { align: 'center' })

  doc.setTextColor(...DARK as [number, number, number])
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT HISTORY', 14, 22)

  const txRows = payments.map(p => [
    new Date(p.createdAt?.toDate?.() || Date.now()).toLocaleDateString(),
    p.monthsPaid.map(formatMonth).join(', '),
    formatCurrency(p.amount),
    p.reference.slice(0, 12) + '...',
    p.status.toUpperCase(),
  ])

  autoTable(doc, {
    startY: 26,
    head: [['Date', 'Months', 'Amount', 'Reference', 'Status']],
    body: txRows.length > 0 ? txRows : [['No transactions yet', '', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: DARK, textColor: GREEN, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...DARK as [number, number, number])
    doc.rect(0, doc.internal.pageSize.getHeight() - 10, W, 10, 'F')
    doc.setTextColor(...MUTED as [number, number, number])
    doc.setFontSize(7)
    doc.text(
      'This statement is confidential and intended solely for the named member.',
      W / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    )
    doc.text(`Page ${i} of ${pageCount}`, W - 14, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
  }

  // ── Save ──────────────────────────────────────────────────────
  doc.save(`WBL_Statement_${user.name.replace(/\s+/g, '_')}_${currentDate()}.pdf`)
}

function currentDate() {
  return new Date().toISOString().split('T')[0]
}
