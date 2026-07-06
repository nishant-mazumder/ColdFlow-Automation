import { google } from 'googleapis';
import { oauth2Client } from '../config/google';
import { prisma } from '../prisma';

import crypto from 'crypto';



export async function sendEmail(leadId: string, templateId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { strategy: true } });
    const template = await prisma.template.findUnique({ where: { id: templateId } });

    if (!lead || !template) throw new Error('Lead or Template not found');

    let refreshToken = null;
    if (lead.strategy.emailAccountId) {
      const emailAccount = await prisma.emailAccount.findUnique({ where: { id: lead.strategy.emailAccountId } });
      if (emailAccount) refreshToken = emailAccount.googleRefreshToken;
    }

    if (!refreshToken) {
      const settings = await prisma.settings.findFirst();
      refreshToken = settings?.googleRefreshToken;
    }

    if (!refreshToken) throw new Error('No authenticated email account found for this strategy');

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 1. Variable Replacement
    let rawBody = template.body.replace(/{{businessName}}/g, lead.businessName);
    let rawSubject = template.subject;

    // 2. Format HTML
    let htmlBody = rawBody;
    if (!/<[a-z][\s\S]*>/i.test(htmlBody)) {
      htmlBody = htmlBody.replace(/\r?\n/g, '<br />');
    } else {
      // Convert Quill's <p> tags strictly to <br> to ensure Gmail doesn't strip empty lines or add unexpected margins
      htmlBody = htmlBody
        .replace(/<p[^>]*><br\s*\/?><\/p>/gi, '<br />')
        .replace(/<\/p>/gi, '<br />')
        .replace(/<p[^>]*>/gi, '')
        .replace(/(<br\s*\/?>)+$/i, ''); // trim trailing breaks
    }

    // 3. Generate Plain Text Fallback
    let plainTextBody = htmlBody
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>?/gm, '')
      .trim();

    // 4. Construct Headers
    const boundary = `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
    const headers = [
      `To: ${lead.email}`,
      `Subject: ${rawSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`
    ];

    // Threading logic for Follow-ups
    if (lead.threadId && template.stage !== 'INITIAL') {
      const thread = await gmail.users.threads.get({ userId: 'me', id: lead.threadId });
      const firstMessage = thread.data.messages?.[0];
      
      let parentMessageId = '';
      if (firstMessage?.payload?.headers) {
        const header = firstMessage.payload.headers.find(h => h.name?.toLowerCase() === 'message-id');
        if (header) parentMessageId = header.value || '';
      }

      if (parentMessageId) {
        headers.push(`In-Reply-To: ${parentMessageId}`);
        headers.push(`References: ${parentMessageId}`);
      }
    }

    // 5. Construct Full Message
    const messageParts = [
      ...headers,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      plainTextBody,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlBody,
      ``,
      `--${boundary}--`
    ];

    const rawMessage = messageParts.join('\n');
    // Base64URL encode
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: lead.threadId || undefined,
      },
    });

    const threadId = response.data.threadId;

    // Log the sent email
    await prisma.emailLog.create({
      data: {
        leadId: lead.id,
        templateId: template.id,
        stage: template.stage,
      }
    });

    return threadId;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
