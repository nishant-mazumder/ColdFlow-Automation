import { google } from 'googleapis';
import { oauth2Client } from '../config/google';
import { prisma } from '../prisma';

// [Sentinel Agent]: Securely scans Gmail inbox before queue execution 
// to prevent sending automated follow-ups to leads that have already replied or bounced.
export async function scanInboxForReplies() {
  console.log('Starting Pre-Flight Inbox Scan...');
  
  try {
    const activeLeads = await prisma.lead.findMany({
      where: {
        status: 'IN_PROGRESS',
        threadId: { not: null }
      },
      include: { strategy: true }
    });

    if (activeLeads.length === 0) {
      console.log('No active threads to scan.');
      return;
    }

    const settings = await prisma.settings.findFirst();

    // Group leads by their email account refresh token
    const tokenGroups: Record<string, { leads: any[] }> = {};

    for (const lead of activeLeads) {
      let token = null;
      if (lead.strategy.emailAccountId) {
        const acc = await prisma.emailAccount.findUnique({ where: { id: lead.strategy.emailAccountId }});
        if (acc) token = acc.googleRefreshToken;
      }
      if (!token) token = settings?.googleRefreshToken;

      if (token) {
        if (!tokenGroups[token]) tokenGroups[token] = { leads: [] };
        tokenGroups[token].leads.push(lead);
      }
    }

    let repliesDetected = 0;
    let bouncesDetected = 0;

    // Iterate through each unique email account (token)
    for (const [token, group] of Object.entries(tokenGroups)) {
      oauth2Client.setCredentials({ refresh_token: token });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      let myEmail = '';
      try {
        const profile = await gmail.users.getProfile({ userId: 'me' });
        myEmail = profile.data.emailAddress?.toLowerCase() || '';
      } catch (err) {
        console.error('Failed to get profile for a token, skipping group.');
        continue;
      }
      
      if (!myEmail) continue;

      for (const lead of group.leads) {
        try {
          const thread = await gmail.users.threads.get({ userId: 'me', id: lead.threadId });
          const messages = thread.data.messages || [];

          if (messages.length <= 1) continue;

          let hasHumanReply = false;
          let hasBounce = false;

          for (let i = 1; i < messages.length; i++) {
            const msg = messages[i];
            const headers = msg.payload?.headers || [];
            const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from')?.value?.toLowerCase() || '';

            if (fromHeader && !fromHeader.includes(myEmail)) {
              if (fromHeader.includes('mailer-daemon') || fromHeader.includes('postmaster')) {
                hasBounce = true;
              } else {
                hasHumanReply = true;
              }
            }
          }

          if (hasBounce) {
            await prisma.lead.update({ where: { id: lead.id }, data: { status: 'BOUNCED' } });
            bouncesDetected++;
          } else if (hasHumanReply) {
            await prisma.lead.update({ where: { id: lead.id }, data: { status: 'REPLIED' } });
            repliesDetected++;
          }
        } catch (err: any) {
          if (err.code !== 404) console.error(`[Inbox Scanner] Error for ${lead.email}:`, err.message);
        }
      }
    }

    console.log(`Inbox Scan Complete. Detected ${repliesDetected} new replies and ${bouncesDetected} new bounces.`);

  } catch (error) {
    console.error('Fatal error during inbox scanning:', error);
  }
}
