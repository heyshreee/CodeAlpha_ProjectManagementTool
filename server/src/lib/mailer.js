const env = require('../config/env');
const logger = require('./logger');

// Nodemailer transport, created lazily so dev/test environments that never
// configure SMTP pay no startup cost.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host) return null;
  // Using `nodemailer` directly; kept as a lazy require so this module still
  // loads if the dependency were ever removed in a minimal install.
  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user && env.smtp.pass
      ? { user: env.smtp.user, pass: env.smtp.pass }
      : undefined,
  });
  return transporter;
}

/**
 * Send an email.
 *   SMTP configured -> send via smtp (delivered: true, via: 'smtp').
 *   Not configured + non-production -> pretty-print for local dev/testing
 *     (delivered: true, via: 'console'). This keeps reset tokens usable when
 *     running the stack locally without an SMTP server.
 *   Not configured + production -> fails gracefully (delivered: false) and the
 *     operator is alerted via logs; totals are never silently lost.
 * In production the token is NEVER written to logs.
 */
async function sendMail({ to, subject, text }) {
  const t = getTransporter();

  if (t) {
    await t.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
    });
    logger.info({ to, subject }, 'mail.sent');
    return { delivered: true, via: 'smtp' };
  }

  if (env.nodeEnv !== 'production') {
    logger.debug({ to, subject }, 'mail.dev_fallback');
    // eslint-disable-next-line no-console
    console.log(`[mail-dev] ${subject}\nTo: ${to}\n\n${text}`);
    return { delivered: true, via: 'console' };
  }

  logger.warn({ to, subject }, 'mail.not_configured');
  return { delivered: false, via: 'none' };
}

module.exports = { sendMail };