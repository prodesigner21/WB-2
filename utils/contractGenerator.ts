/**
 * utils/contractGenerator.ts
 * Generates a downloadable Membership Contract PDF.
 * Used on the /apply page before submitting.
 */
import jsPDF from 'jspdf'

export function downloadMembershipContract(): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()
  const MARGIN = 20
  const LINE_W = W - MARGIN * 2
  const DARK: [number, number, number] = [10, 16, 32]
  const GREEN: [number, number, number] = [16, 185, 129]
  const GOLD: [number, number, number] = [251, 191, 36]
  const GRAY: [number, number, number] = [100, 110, 130]
  const WHITE: [number, number, number] = [240, 242, 248]

  let y = 0

  // ── Header ───────────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 45, 'F')

  doc.setTextColor(...GREEN)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('WEALTH BUILDING LLC', W / 2, 18, { align: 'center' })

  doc.setTextColor(...GOLD)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('MEMBERSHIP CONTRACT & AGREEMENT', W / 2, 28, { align: 'center' })

  doc.setTextColor(...GRAY)
  doc.setFontSize(8)
  doc.text(`Version 1.0 — Effective ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}`, W / 2, 38, { align: 'center' })

  y = 58

  // ── Helper functions ──────────────────────────────────────────
  function sectionTitle(title: string) {
    doc.setFillColor(16, 185, 129, 0.08 as any)
    doc.setDrawColor(16, 185, 129)
    doc.setFillColor(10, 24, 40)
    doc.rect(MARGIN, y - 5, LINE_W, 10, 'F')
    doc.setTextColor(...GREEN)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, MARGIN + 3, y + 2)
    y += 12
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
  }

  function para(text: string, indent = 0) {
    const lines = doc.splitTextToSize(text, LINE_W - indent)
    doc.text(lines, MARGIN + indent, y)
    y += lines.length * 5.5 + 2
  }

  function bullet(text: string, num?: string) {
    const prefix = num ? `${num}.` : '•'
    const lines = doc.splitTextToSize(text, LINE_W - 10)
    doc.text(prefix, MARGIN + 2, y)
    doc.text(lines, MARGIN + 8, y)
    y += lines.length * 5.5 + 1
  }

  function gap(n = 6) { y += n }

  function checkPageBreak() {
    if (y > 270) {
      doc.addPage()
      doc.setFillColor(...DARK)
      doc.rect(0, 0, W, 12, 'F')
      doc.setTextColor(...GREEN)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('WEALTH BUILDING LLC — MEMBERSHIP CONTRACT (continued)', W / 2, 8, { align: 'center' })
      y = 22
      doc.setTextColor(...WHITE)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
    }
  }

  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // ── 1. Introduction ───────────────────────────────────────────
  sectionTitle('1. INTRODUCTION & PURPOSE')
  para('This Membership Contract ("Agreement") governs participation in Wealth Building LLC ("the Fund"), a private, closed-group collective established for the purpose of pooling financial resources to generate shared wealth through disciplined contributions, investments, and income generation.')
  gap()
  para('By accepting this Agreement, each Member acknowledges full understanding of its terms, obligations, and financial risks.')
  gap()

  checkPageBreak()
  sectionTitle('2. MEMBERSHIP')
  bullet('Membership is by invitation or approved application only.')
  bullet('All applicants must be approved by the Admin before gaining active status.')
  bullet('Members must provide accurate personal information including name, email, and WhatsApp phone number.')
  bullet('Membership is personal and non-transferable.')
  bullet('The Fund reserves the right to reject any application without providing reasons.')
  gap()

  checkPageBreak()
  sectionTitle('3. MONTHLY CONTRIBUTIONS')
  bullet('Each active Member is required to make a fixed monthly contribution as determined by the Fund administrator.', '3.1')
  bullet('The monthly contribution amount may be updated by the Admin with reasonable notice to all Members.', '3.2')
  bullet('Contributions must be paid in chronological order. No Member may skip a month and pay a later month.', '3.3')
  bullet('Members may pay multiple months in a single transaction, provided they are paid in order (oldest first).', '3.4')
  bullet('All payments are processed via Paystack and are subject to admin approval before being counted.', '3.5')
  bullet('A payment is only considered "paid" after explicit admin approval. Pending payments do not count toward ownership calculations.', '3.6')
  gap()

  checkPageBreak()
  sectionTitle('4. OWNERSHIP & PROFIT SHARING')
  bullet('Ownership in the Fund is distributed equally among all active Members.')
  bullet('Each Member\'s share percentage is calculated as: Share = 100 ÷ Total Active Members.')
  bullet('Share percentages are automatically recalculated when a Member joins or exits.')
  bullet('Profit distributions are calculated based on each Member\'s ownership percentage at the time of distribution.')
  bullet('Profit shares are estimates and are not guaranteed. Returns depend on Fund performance.')
  gap()

  checkPageBreak()
  sectionTitle('5. WITHDRAWALS & FUND MANAGEMENT')
  bullet('The Fund\'s net balance is calculated as: Contributions + Income − Withdrawals.')
  bullet('Withdrawals from the Fund may only be authorized by the Admin.')
  bullet('Withdrawal types include: exit payouts, investments, operating expenses, and other admin-approved disbursements.')
  bullet('All withdrawals are recorded with a mandatory reason and are visible to all Members in their financial statements.')
  gap()

  checkPageBreak()
  sectionTitle('6. EXIT PROCEDURE')
  bullet('Any Member may voluntarily request to exit the Fund at any time.', '6.1')
  bullet('Exit requests must be submitted through the platform and are subject to Admin approval.', '6.2')
  bullet('Exit Payout Calculation:', '6.3')
  para('  Gross = Total Contributions + Profit Share\n  Exit Fee = Gross × 7.5%\n  Final Payout = Gross − Exit Fee', 8)
  bullet('The 7.5% exit fee is non-negotiable and is deducted from all exit payouts regardless of reason.', '6.4')
  bullet('Upon exit approval, the Member\'s account is permanently deactivated and their ownership share is redistributed equally among remaining Members.', '6.5')
  bullet('Exit payouts are disbursed within a reasonable timeframe as determined by the Admin.', '6.6')
  gap()

  checkPageBreak()
  sectionTitle('7. PLATFORM & NOTIFICATIONS')
  bullet('Members will receive email and WhatsApp reminders for unpaid months.')
  bullet('Reminders are sent on the 1st, 5th, and 10th of each month to members with outstanding contributions.')
  bullet('It is the Member\'s responsibility to maintain accurate contact information.')
  gap()

  checkPageBreak()
  sectionTitle('8. CONFIDENTIALITY')
  para('All financial data, member information, contribution amounts, income records, and investment details are strictly confidential. Members agree not to disclose any Fund information to third parties. Breach of confidentiality may result in immediate membership termination.')
  gap()

  checkPageBreak()
  sectionTitle('9. DISPUTES')
  para('All disputes shall first be attempted to be resolved through direct negotiation between the parties. If unresolved, disputes shall be escalated to the Fund\'s Admin for final determination. Members agree that the Admin\'s decision on Fund-related matters is binding.')
  gap()

  checkPageBreak()
  sectionTitle('10. AMENDMENTS')
  para('The Fund reserves the right to amend this Agreement at any time. Members will be notified of material changes. Continued membership after notification constitutes acceptance of the updated terms.')
  gap()

  checkPageBreak()
  sectionTitle('11. RISK DISCLOSURE')
  para('Investment involves risk. Wealth Building LLC does not guarantee returns. Past performance is not indicative of future results. Members should only contribute amounts they can afford to have tied up for the medium to long term. By signing this Agreement, Members confirm they understand these risks.')
  gap()

  // ── Signature block ───────────────────────────────────────────
  checkPageBreak()
  gap(4)
  doc.setDrawColor(...GRAY)
  doc.line(MARGIN, y, W - MARGIN, y)
  y += 8

  doc.setTextColor(...GOLD)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('MEMBER ACKNOWLEDGEMENT', MARGIN, y)
  y += 8

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  para('By submitting a membership application or checking the acceptance box on the platform, the Member confirms they have read, understood, and agree to be bound by all terms of this Membership Contract.')
  gap(8)

  // Signature lines
  doc.setDrawColor(...GRAY)
  doc.line(MARGIN, y, MARGIN + 70, y)
  doc.line(MARGIN + 100, y, MARGIN + 160, y)
  y += 5
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('Member Signature', MARGIN, y)
  doc.text('Date', MARGIN + 100, y)
  y += 10
  doc.line(MARGIN, y, MARGIN + 70, y)
  y += 5
  doc.text('Full Name (Print)', MARGIN, y)

  // ── Footer ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFillColor(...DARK)
    doc.rect(0, doc.internal.pageSize.getHeight() - 10, W, 10, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.text(
      'Wealth Building LLC — Private & Confidential — Not for public distribution',
      W / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' }
    )
    doc.text(`Page ${i} of ${totalPages}`, W - MARGIN, doc.internal.pageSize.getHeight() - 5, { align: 'right' })
  }

  doc.save(`WBL_Membership_Contract_${new Date().toISOString().split('T')[0]}.pdf`)
}
