// One-time helper: run this after GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
// are set in backend/.env to mint a Drive refresh token.
//
// Usage: node scripts/get-refresh-token.js
// Open the printed URL in your browser, sign in, click Allow — this
// script catches the redirect locally and prints the refresh token.

import http from "node:http";
import { google } from "googleapis";
import "dotenv/config";

const PORT = 45678;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env first.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
});

console.log("\nOpen this URL in your browser, sign in, and click Allow:\n");
console.log(authUrl + "\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No code received — check the terminal and try again.");
    return;
  }

  res.end("Success — you can close this tab and go back to the terminal.");
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nRefresh token (paste into backend/.env as GOOGLE_REFRESH_TOKEN):\n");
  console.log(tokens.refresh_token);
  console.log(`\nAlso set GOOGLE_REDIRECT_URI=${REDIRECT_URI}\n`);
  process.exit(0);
});

server.listen(PORT, () => console.log(`Waiting for the redirect on ${REDIRECT_URI} ...`));
