/**
 * Script to get Google OAuth refresh token
 * Run with: npx ts-node scripts/get-token.ts
 */

import { google } from 'googleapis';
import * as http from 'http';
import * as url from 'url';
import * as readline from 'readline';

// You'll need to fill these in from your Google Cloud Console
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost:3002/callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getRefreshToken() {
  console.log('\n🔐 Google Drive OAuth Token Generator\n');
  console.log('This script will help you get a refresh token for Google Drive uploads.\n');

  if (CLIENT_ID === 'YOUR_CLIENT_ID' || CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
    console.log('⚠️  First, set your credentials:');
    console.log('   export GOOGLE_CLIENT_ID=your-client-id');
    console.log('   export GOOGLE_CLIENT_SECRET=your-client-secret\n');
    console.log('Get these from: https://console.cloud.google.com/apis/credentials\n');
    process.exit(1);
  }

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  });

  console.log('1. Open this URL in your browser:\n');
  console.log(`   ${authUrl}\n`);
  console.log('2. Sign in and authorize the application\n');
  console.log('3. You will be redirected. Copy the code from the URL.\n');

  // Start local server to catch the callback
  const server = http.createServer(async (req, res) => {
    try {
      const queryParams = new url.URL(req.url!, `http://localhost:3001`).searchParams;
      const code = queryParams.get('code');

      if (code) {
        const { tokens } = await oauth2Client.getToken(code);
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>✅ Success!</h1>
              <p>You can close this window and check the terminal.</p>
            </body>
          </html>
        `);

        console.log('\n✅ Success! Here are your tokens:\n');
        console.log('Add this to your .env file:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        
        server.close();
        process.exit(0);
      } else {
        res.writeHead(400);
        res.end('No code received');
      }
    } catch (error) {
      console.error('Error getting token:', error);
      res.writeHead(500);
      res.end('Error getting token');
      server.close();
      process.exit(1);
    }
  });

  server.listen(3002, () => {
    console.log('Waiting for authorization... (listening on http://localhost:3002)\n');
  });
}

getRefreshToken();
