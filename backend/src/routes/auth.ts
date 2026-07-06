import { Router } from 'express';
import { oauth2Client, SCOPES } from '../config/google';
import { google } from 'googleapis';
import { prisma } from '../prisma';

const router = Router();

// Step 1: Redirect to Google Consent Screen
router.get('/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial to get a refresh token
    scope: SCOPES,
    prompt: 'consent' // Forces Google to provide a refresh token
  });
  res.redirect(url);
});

// Step 2: Google Callback (After user logs in)
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Save refresh token to EmailAccount table
    if (tokens.refresh_token) {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress?.toLowerCase();

      if (emailAddress) {
        await prisma.emailAccount.upsert({
          where: { emailAddress },
          update: { googleRefreshToken: tokens.refresh_token },
          create: { emailAddress, googleRefreshToken: tokens.refresh_token }
        });
      }
    }

    res.send(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; color: white; flex-direction: column; }
            h1 { color: #10b981; }
          </style>
        </head>
        <body>
          <h1>Authentication Successful! 🎉</h1>
          <p>Your Google account is securely connected. You can close this window and return to the dashboard.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error during Google OAuth:', error);
    res.status(500).send(`Authentication failed: ${error.message || error}`);
  }
});

// Check status for dashboard
router.get('/status', async (req, res) => {
  const settings = await prisma.settings.findFirst();
  res.json({
    isAuthenticated: !!settings?.googleRefreshToken
  });
});

export default router;
