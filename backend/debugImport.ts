import { prisma } from './src/prisma';
import { google } from 'googleapis';
import { oauth2Client } from './src/config/google';
import { verifyEmail } from './src/services/emailValidator';

async function main() {
  const latestStrategy = await prisma.strategy.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { emailAccount: true }
  });

  if (!latestStrategy) {
    console.log("No strategy found");
    return;
  }

  let token = latestStrategy.emailAccount?.googleRefreshToken;
  if (!token) {
    const firstAccount = await prisma.emailAccount.findFirst();
    token = firstAccount?.googleRefreshToken;
  }
  
  if (!token) {
    console.log("No token found");
    return;
  }

  oauth2Client.setCredentials({ refresh_token: token });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId: latestStrategy.googleSheetId });
  const firstSheetName = spreadsheetInfo.data.sheets?.[0]?.properties?.title || 'Sheet1';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: latestStrategy.googleSheetId,
    range: `'${firstSheetName}'!A2:B`, 
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    console.log("No rows in sheet");
    return;
  }

  console.log(`Found ${rows.length} rows in the Google Sheet.`);

  for (const row of rows) {
    const email = row[1]?.trim()?.toLowerCase();
    if (!email) {
      console.log(`Row without email, skipping: ${row[0]}`);
      continue;
    }
    
    console.log(`Verifying: ${email}`);
    const isValid = await verifyEmail(email);
    if (!isValid) {
      console.log(`>>> VALIDATION FAILED FOR: ${email}`);
    } else {
      console.log(`--- Passed for: ${email}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
