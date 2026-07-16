/**
 * Optional dual-write: Google Apps Script → Sheet
 *
 * 1. Create a Google Sheet with headers: email | wallet | x_handle | created_at
 * 2. Extensions → Apps Script → paste this → Deploy → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 3. Copy the web app URL into Vercel env: GOOGLE_SHEETS_WEBHOOK_URL
 */

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    sheet.appendRow([
      body.email || "",
      body.wallet || "",
      body.x_handle || "",
      body.created_at || new Date().toISOString(),
    ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON,
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
