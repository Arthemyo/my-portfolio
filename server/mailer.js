import nodemailer from "nodemailer";

// Returns an object with sendMail(). Without SMTP settings (development only)
// messages are printed to the console instead of being sent.
export function createMailer(config, logger = console) {
  if (config.smtp) {
    return nodemailer.createTransport({
      ...config.smtp,
      requireTLS: true,
      tls: { minVersion: "TLSv1.2" },
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  logger.warn("[mail] SMTP not configured — messages will be logged to the console, not sent.");
  return {
    async sendMail(message) {
      logger.info(`[mail] (dev) To: ${message.to} | Reply-To: ${message.replyTo.address} | Subject: ${message.subject}\n${message.text}`);
      return { messageId: "dev-console" };
    },
  };
}
