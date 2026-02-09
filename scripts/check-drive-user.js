
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes if present
      process.env[key] = value;
    }
  });
}

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

  } catch (error) {
    console.error('❌ Error fetching Drive user:', error.message);
  }
}

getDriveUser();
