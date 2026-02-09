
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

async function getDriveUser() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Error: Missing Google OAuth credentials in .env file.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/api/auth/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.about.get({
      fields: 'user(emailAddress, displayName)',
    });

    const user = response.data.user;
    if (user) {
        console.log('\n---------------------------------------------------');
        console.log('✅ Authenticated User Found:');
        console.log(`   Email: ${user.emailAddress}`);
        console.log(`   Name:  ${user.displayName}`);
        console.log('---------------------------------------------------\n');
    } else {
        console.log('❌ Could not retrieve user information.');
    }

  } catch (error: any) {
    console.error('❌ Error fetching Drive user:', error.message);
  }
}

getDriveUser();
