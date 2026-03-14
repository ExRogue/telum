import { Resend } from 'resend';
import { sql } from '@vercel/postgres';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Monitus <noreply@monitus.ai>';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log('[EMAIL DEV] Would send to:', to, 'Subject:', subject);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
<div style="background:#111927;padding:24px 32px;border-radius:12px 12px 0 0">
<h1 style="margin:0;color:#E1E7EF;font-size:20px;font-weight:600">Monitus</h1>
</div>
<div style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;color:#1a1a1a;line-height:1.6">
${content}
</div>
<p style="text-align:center;color:#8494A7;font-size:12px;margin-top:24px">
&copy; ${new Date().getFullYear()} Monitus. All rights reserved.<br>
<a href="%UNSUBSCRIBE_URL%" style="color:#4A9E96">Unsubscribe</a>
</p>
</div></body></html>`;
}

export async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<void> {
  await send(to, subject, html || layout(`<p>${body.replace(/\n/g, '<br>')}</p>`));
}

export async function sendWelcomeEmail(userId: string, email: string, name: string): Promise<void> {
  try {
    await send(email, 'Welcome to Monitus', layout(`
      <h2 style="margin:0 0 16px;color:#111927">Welcome, ${name}!</h2>
      <p>Thanks for joining Monitus. We help insurance professionals generate compliant, branded content from industry news.</p>
      <p><strong>Get started:</strong></p>
      <ol>
        <li>Set up your company profile</li>
        <li>Choose a subscription plan</li>
        <li>Generate your first content piece</li>
      </ol>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/dashboard" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px">Go to Dashboard</a>
    `));
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/reset-password?token=${resetToken}`;
  await send(email, 'Reset your Monitus password', layout(`
    <h2 style="margin:0 0 16px;color:#111927">Password Reset</h2>
    <p>We received a request to reset your password. Click the button below to set a new password.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
    <p style="color:#666;font-size:14px">This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
  `));
}

export async function sendEmailVerification(email: string, verifyToken: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/api/auth/verify-email?token=${verifyToken}`;
  await send(email, 'Verify your Monitus email', layout(`
    <h2 style="margin:0 0 16px;color:#111927">Verify Your Email</h2>
    <p>Please confirm your email address by clicking the button below.</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Verify Email</a>
    <p style="color:#666;font-size:14px">This link expires in 24 hours.</p>
  `));
}

export async function sendTeamInviteEmail(email: string, inviterName: string, companyName: string, inviteToken: string): Promise<void> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/api/team/accept?token=${inviteToken}`;
  await send(email, `You're invited to join ${companyName} on Monitus`, layout(`
    <h2 style="margin:0 0 16px;color:#111927">Team Invitation</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on Monitus.</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Accept Invitation</a>
    <p style="color:#666;font-size:14px">This invitation expires in 7 days.</p>
  `));
}

export async function sendUsageAlertEmail(userId: string, alertType: string, threshold: number, limitType: string): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const isWarning = alertType === 'usage_warning';
    await send(user.email, isWarning
      ? `Usage Alert: ${threshold}% of ${limitType} limit reached`
      : `Limit Reached: ${limitType} limit exceeded`,
    layout(`
      <h2 style="margin:0 0 16px;color:#111927">${isWarning ? 'Usage Warning' : 'Limit Reached'}</h2>
      <p>Hi ${user.name},</p>
      <p>${isWarning
        ? `You have used <strong>${threshold}%</strong> of your monthly ${limitType} limit.`
        : `You have reached your monthly <strong>${limitType}</strong> limit.`
      }</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/billing" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">${isWarning ? 'View Usage' : 'Upgrade Plan'}</a>
    `));
  } catch (error) {
    console.error('Failed to send usage alert email:', error);
  }
}

export async function sendSubscriptionConfirmationEmail(userId: string, planName: string, planPrice?: number): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const priceText = planPrice ? `£${planPrice}/month` : '';
    await send(user.email, `Subscription Confirmed: ${planName} Plan`, layout(`
      <h2 style="margin:0 0 16px;color:#111927">Subscription Confirmed</h2>
      <p>Hi ${user.name},</p>
      <p>Your <strong>${planName}</strong> plan is now active${priceText ? ` at ${priceText}` : ''}.</p>
      <div style="background:#f4f6f8;padding:16px;border-radius:8px;margin:16px 0">
        <p style="margin:0"><strong>Plan:</strong> ${planName}</p>
        ${priceText ? `<p style="margin:4px 0 0"><strong>Price:</strong> ${priceText}</p>` : ''}
        <p style="margin:4px 0 0"><strong>Status:</strong> Active</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/dashboard" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a>
    `));
  } catch (error) {
    console.error('Failed to send subscription confirmation email:', error);
  }
}

export async function sendNotificationDigest(userId: string, notifications: any[]): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const items = notifications.map(n => `<li><strong>${n.title}</strong>: ${n.message}</li>`).join('');
    await send(user.email, `Your Monitus Digest - ${notifications.length} Updates`, layout(`
      <h2 style="margin:0 0 16px;color:#111927">Your Activity Digest</h2>
      <p>Hi ${user.name}, you have ${notifications.length} new update(s):</p>
      <ul>${items}</ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/dashboard" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">View Dashboard</a>
    `));
  } catch (error) {
    console.error('Failed to send notification digest:', error);
  }
}

export async function sendContentDeliveryEmail(userId: string, content: any[]): Promise<void> {
  try {
    const result = await sql`SELECT email, name FROM users WHERE id = ${userId}`;
    const user = result.rows[0];
    if (!user) return;

    const items = content.map(c => `<li><strong>[${c.content_type}]</strong> ${c.title}</li>`).join('');
    await send(user.email, `Your Monitus Content - ${content.length} Piece(s) Generated`, layout(`
      <h2 style="margin:0 0 16px;color:#111927">Content Ready</h2>
      <p>Hi ${user.name}, your content has been generated:</p>
      <ul>${items}</ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://monitus.ai'}/content" style="display:inline-block;background:#4A9E96;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Review Content</a>
    `));
  } catch (error) {
    console.error('Failed to send content delivery email:', error);
  }
}

export default {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendTeamInviteEmail,
  sendUsageAlertEmail,
  sendSubscriptionConfirmationEmail,
  sendNotificationDigest,
  sendContentDeliveryEmail,
};
