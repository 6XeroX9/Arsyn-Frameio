import { google } from "googleapis";
import "dotenv/config";

// One-time setup: run the OAuth consent flow once locally, save the
// refresh token to .env. After that this refreshes access tokens itself.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth: oauth2Client });

export async function getFileMetadata(fileId) {
  const { data } = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, videoMediaMetadata",
  });
  return data;
}

// Streams the file from Drive straight through to the client, forwarding
// the Range header both ways so the <video> tag can scrub without
// downloading the whole file first.
export async function streamFile(fileId, rangeHeader, res) {
  const driveRes = await drive.files.get(
    { fileId, alt: "media" },
    {
      responseType: "stream",
      headers: rangeHeader ? { Range: rangeHeader } : {},
    }
  );

  res.status(driveRes.status === 206 || rangeHeader ? 206 : 200);
  res.setHeader("Accept-Ranges", "bytes");
  if (driveRes.headers["content-range"]) {
    res.setHeader("Content-Range", driveRes.headers["content-range"]);
  }
  if (driveRes.headers["content-length"]) {
    res.setHeader("Content-Length", driveRes.headers["content-length"]);
  }
  res.setHeader("Content-Type", driveRes.headers["content-type"] || "video/mp4");

  driveRes.data.pipe(res);
}
