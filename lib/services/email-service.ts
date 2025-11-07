// 🛡️ SERVER-ONLY MODULE - Cannot be imported in client components
import 'server-only';

import sgMail from '@sendgrid/mail';
import type { Notification } from '@/lib/types/notification';
import { logger } from '@/lib/utils/logger';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailService {
  /**
   * Send email notification
   */
  static async send(notification: Notification): Promise<boolean> {
    try {
      // Validate API key
      if (!process.env.SENDGRID_API_KEY) {
        logger.error('SendGrid API key not configured');
        return false;
      }

      // Validate recipient email
      if (!notification.recipientEmail) {
        logger.error('Recipient email not provided', { notificationId: notification.id });
        return false;
      }

      const msg = {
        to: notification.recipientEmail,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@locai.app',
          name: process.env.FROM_NAME || 'Locai',
        },
        subject: notification.title,
        text: notification.message,
        html: this.renderTemplate(notification),
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
      };

      await sgMail.send(msg);

      logger.info('Email sent successfully', {
        notificationId: notification.id,
        recipientEmail: notification.recipientEmail?.substring(0, 5) + '***',
        type: notification.type,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Render HTML email template
   */
  private static renderTemplate(notification: Notification): string {
    const priorityColors: Record<string, string> = {
      low: '#9e9e9e',
      normal: '#2196f3',
      high: '#ff9800',
      urgent: '#f44336',
    };

    const priorityColor = priorityColors[notification.priority] || priorityColors.normal;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .priority-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      background-color: ${priorityColor};
      color: white;
      margin-top: 10px;
    }
    .content {
      padding: 30px;
    }
    .message {
      font-size: 16px;
      color: #555;
      margin-bottom: 30px;
      white-space: pre-wrap;
    }
    .action-button {
      display: inline-block;
      padding: 12px 30px;
      background: #1976d2;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .action-button:hover {
      background: #1565c0;
    }
    .metadata {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #888;
    }
    .footer {
      background: #f9f9f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #eee;
    }
    .footer a {
      color: #1976d2;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 ${notification.title}</h1>
      <span class="priority-badge">${notification.priority.toUpperCase()}</span>
    </div>

    <div class="content">
      <div class="message">
        ${notification.message}
      </div>

      ${notification.actionUrl ? `
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.locai.com'}${notification.actionUrl}"
             class="action-button">
            ${notification.actionLabel || 'Ver Detalhes'}
          </a>
        </div>
      ` : ''}

      ${notification.metadata && Object.keys(notification.metadata).length > 0 ? `
        <div class="metadata">
          <strong>Informações Adicionais:</strong><br>
          ${Object.entries(notification.metadata)
            .map(([key, value]) => `<div>${key}: ${value}</div>`)
            .join('')}
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Esta é uma notificação automática do Locai.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.locai.com'}/dashboard/settings">
          Gerenciar Preferências de Notificação
        </a>
      </p>
      <p style="margin-top: 10px; color: #aaa;">
        ID da Notificação: ${notification.id}
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send test email
   */
  static async sendTest(to: string): Promise<boolean> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SendGrid API key not configured');
      }

      const msg = {
        to,
        from: {
          email: process.env.FROM_EMAIL || 'noreply@locai.app',
          name: process.env.FROM_NAME || 'Locai',
        },
        subject: 'Teste de Email - Locai',
        text: 'Este é um email de teste do sistema Locai.',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Teste de Email Bem-sucedido!</h2>
            <p>Se você está vendo esta mensagem, o sistema de email do Locai está funcionando corretamente.</p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Enviado em: ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
      };

      await sgMail.send(msg);

      logger.info('Test email sent successfully', { to });

      return true;
    } catch (error) {
      logger.error('Failed to send test email', {
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Send batch emails (for multiple notifications)
   */
  static async sendBatch(notifications: Notification[]): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    // Send in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(notification => this.send(notification))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        } else {
          failed++;
        }
      });

      // Small delay between batches to respect rate limits
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.info('Batch email send completed', { sent, failed, total: notifications.length });

    return { sent, failed };
  }
}
