import { google } from 'googleapis';
import { oauth2Client } from '../config/google';
import { prisma } from '../prisma';

async function main() {
  const settings = await prisma.settings.findFirst();
  if (!settings || !settings.googleRefreshToken) {
    console.log('No token found in Settings. Nothing to migrate.');
    return;
  }

  const token = settings.googleRefreshToken;
  oauth2Client.setCredentials({ refresh_token: token });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress?.toLowerCase();

    if (emailAddress) {
      await prisma.emailAccount.upsert({
        where: { emailAddress },
        update: { googleRefreshToken: token },
        create: { emailAddress, googleRefreshToken: token }
      });
      console.log(`Successfully migrated account: ${emailAddress} to the new system!`);
    } else {
      console.log('Could not fetch email address from Google API.');
    }
  } catch (error: any) {
    console.error('Error during migration:', error.message);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
