import { google } from 'googleapis';
import { oauth2Client } from '../config/google';
import { prisma } from '../prisma';
import { verifyEmail } from './emailValidator';

// [Data Harvester Agent]: Acts as the bridge between the CRM and the engine.
// Dynamically monitors and syncs Google Sheets in real-time, sanitizing data before database injection.
export async function syncLeadsFromSheet(strategyId: string) {
  try {
    const strategy = await prisma.strategy.findUnique({ 
      where: { id: strategyId },
      include: { emailAccount: true }
    });
    if (!strategy) throw new Error('Strategy not found');

    let token = strategy.emailAccount?.googleRefreshToken;
    
    // Fallback: If no account assigned yet, just grab the first valid account in the DB
    if (!token) {
      const firstAccount = await prisma.emailAccount.findFirst();
      token = firstAccount?.googleRefreshToken;
    }
    
    if (!token) {
      const settings = await prisma.settings.findFirst();
      token = settings?.googleRefreshToken;
    }
    
    if (!token) throw new Error('Not authenticated with Google');

    oauth2Client.setCredentials({ refresh_token: token });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // Fetch the actual name of the first tab in the spreadsheet
    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: strategy.googleSheetId });
    const firstSheetName = spreadsheetInfo.data.sheets?.[0]?.properties?.title || 'Sheet1';

    // Fetch Column A (Business Name) and Column B (Email)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: strategy.googleSheetId,
      range: `'${firstSheetName}'!A2:B`, 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log(`No data found in sheet for strategy ${strategyId}.`);
      return { added: 0 };
    }

    let addedCount = 0;
    for (const row of rows) {
      const businessName = row[0]?.trim();
      const email = row[1]?.trim()?.toLowerCase();

      if (!email) continue; // Skip rows without an email address

      // Run Native 3-Layer Validation (Syntax -> Disposable -> DNS MX)
      const isValid = await verifyEmail(email);
      if (!isValid) continue; // Safely skip invalid emails

      // Check if lead already exists to avoid duplicates
      const existing = await prisma.lead.findUnique({
        where: {
          strategyId_email: {
            strategyId,
            email,
          },
        },
      });

      if (!existing) {
        await prisma.lead.create({
          data: {
            strategyId,
            email,
            businessName: businessName || 'Valued Business',
          },
        });
        addedCount++;
      }
    }

    console.log(`Successfully synced ${addedCount} new leads for strategy ${strategyId}`);
    return { added: addedCount };
  } catch (error) {
    console.error('Error syncing leads from Google Sheets:', error);
    throw error;
  }
}

export async function getSpreadsheetTitle(spreadsheetId: string) {
  try {
    // For fetching title, just grab any connected account as a fallback
    const firstAccount = await prisma.emailAccount.findFirst();
    let token = firstAccount?.googleRefreshToken;
    
    if (!token) {
      const settings = await prisma.settings.findFirst();
      token = settings?.googleRefreshToken;
    }
    
    if (!token) return 'Unknown Sheet';

    oauth2Client.setCredentials({ refresh_token: token });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
    return spreadsheetInfo.data.properties?.title || 'Unknown Sheet';
  } catch (error) {
    return 'Unknown Sheet';
  }
}
