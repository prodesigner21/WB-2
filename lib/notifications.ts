/**
 * lib/notifications.ts
 * Email and WhatsApp notification helpers.
 * Called from server-side API routes only.
 */
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #060a10; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { background: #0a1020; border: 1px solid rgba(16,185,129,0.2); border-radius: 12px 12px 0 0; padding: 32px; text-align: center; }
    .logo { color: #10b981; font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .tagline { color: #6b7280; font-size: 12px; margin-top: 4px; }
    .body { background: #0d1628; border: 1px solid rgba(255,255,255,0.06); border-top: none; padding: 32px; }
    .footer { background: #0a1020; border: 1px solid rgba(255,255,255,0.06); border-top: none; border-radius: 0 0 12px 12px; padding: 20px; text-align: center; color: #4b5563; font-size: 12px; }
    h2 { color: #f9fafb; margin: 0 0 16px; font-size: 20px; }
    p { color: #9ca3af; line-height: 1.6; margin: 0 0 12px; }
    .highlight { color: #10b981; font-weight: 600; }
    .amount { font-size: 28px; font-weight: 700; color: #fbbf24; margin: 16px 0; }
    .btn { display: inline-block; background: #10b981; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .badge-danger { background: rgba(239,68,68,0.15); color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">WEALTH BUILDING LLC</div>
      <div class="tagline">Member Financial Platform</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      This is an automated message. Do not reply to this email.<br>
      © ${new Date().getFullYear()} Wealth Building LLC. All rights reserved.
    </div>
  </div>
</body>
</html>`
}

// ─── SEND FUNCTIONS ──────────────────────────────────────────────

export async function sendPaymentReminderEmail(params: {
  to: string
  name: string
  unpaidMonths: string[]
  paymentLink: string
}): Promise<void> {
  const { to, name, unpaidMonths, paymentLink } = params
  const monthList = unpaidMonths.map(m => `<li style="color:#9ca3af;">${m}</li>`).join('')

  const content = `
    <h2>Payment Reminder</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>You have <span class="badge-danger">${unpaidMonths.length} unpaid month${unpaidMonths.length > 1 ? 's' : ''}</span> on your account.</p>
    <hr class="divider">
    <p><strong style="color:#f9fafb;">Outstanding months:</strong></p>
    <ul>${monthList}</ul>
    <p>Please settle your contributions to remain in good standing.</p>
    <a href="${paymentLink}" class="btn">Pay Now →</a>
    <p style="margin-top: 16px; font-size: 12px;">Note: Months must be paid in order. No skipping is allowed.</p>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `[Action Required] ${unpaidMonths.length} Unpaid Month(s) — Wealth Building LLC`,
    html: baseTemplate(content),
  })
}

export async function sendPaymentConfirmationEmail(params: {
  to: string
  name: string
  amount: number
  months: string[]
  reference: string
}): Promise<void> {
  const { to, name, amount, months, reference } = params
  const content = `
    <h2>Payment Received</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>We've received your payment. It is currently <strong style="color:#fbbf24;">pending admin approval</strong>.</p>
    <div class="amount">₦${amount.toLocaleString()}</div>
    <p><strong style="color:#f9fafb;">Months covered:</strong> ${months.join(', ')}</p>
    <p><strong style="color:#f9fafb;">Reference:</strong> <code style="color:#6ee7b7; font-size:13px;">${reference}</code></p>
    <hr class="divider">
    <p>You will be notified once an admin approves your payment.</p>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Payment Received — Awaiting Approval',
    html: baseTemplate(content),
  })
}

export async function sendApprovalNotificationEmail(params: {
  to: string
  name: string
  months: string[]
  approved: boolean
  reason?: string
}): Promise<void> {
  const { to, name, months, approved, reason } = params
  const content = approved
    ? `
      <h2>Payment Approved ✓</h2>
      <p>Hi <span class="highlight">${name}</span>,</p>
      <p>Your payment has been <strong style="color:#10b981;">approved</strong>.</p>
      <p><strong style="color:#f9fafb;">Months marked paid:</strong> ${months.join(', ')}</p>
      <p>Your contribution record has been updated.</p>
    `
    : `
      <h2>Payment Rejected</h2>
      <p>Hi <span class="highlight">${name}</span>,</p>
      <p>Your payment has been <strong style="color:#ef4444;">rejected</strong>.</p>
      ${reason ? `<p><strong style="color:#f9fafb;">Reason:</strong> ${reason}</p>` : ''}
      <p>Please contact your admin for more information.</p>
    `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: approved ? 'Payment Approved — Wealth Building LLC' : 'Payment Rejected',
    html: baseTemplate(content),
  })
}

export async function sendWelcomeEmail(params: {
  to: string
  name: string
  sharePercent: number
}): Promise<void> {
  const { to, name, sharePercent } = params
  const content = `
    <h2>Welcome to Wealth Building LLC</h2>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>Your membership has been <strong style="color:#10b981;">approved</strong>! You are now an active member.</p>
    <p><strong style="color:#f9fafb;">Your ownership share:</strong> <span class="highlight">${sharePercent.toFixed(2)}%</span></p>
    <p>Log in to your dashboard to make your first contribution and track your wealth growth.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Welcome — You\'ve been approved!',
    html: baseTemplate(content),
  })
}

// ─── WHATSAPP (TWILIO ABSTRACTION) ───────────────────────────────

export async function sendWhatsAppReminder(params: {
  phone: string
  name: string
  unpaidMonths: string[]
  paymentLink: string
}): Promise<void> {
  // Twilio WhatsApp sandbox integration
  // In production: replace with live Twilio number
  const { phone, name, unpaidMonths, paymentLink } = params

  try {
    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${phone}`,
      body: `*Wealth Building LLC*\n\nHi ${name}, you have ${unpaidMonths.length} unpaid month(s): ${unpaidMonths.join(', ')}.\n\nPlease pay here: ${paymentLink}\n\n_Do not ignore this reminder._`,
    })
  } catch (err) {
    // WhatsApp is non-critical — log but don't throw
    console.warn('[WhatsApp reminder failed]', err)
  }
}
