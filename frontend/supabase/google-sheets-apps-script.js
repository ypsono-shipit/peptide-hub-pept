/**
 * PEPT waitlist → Google Sheet (durable, free)
 *
 * Setup (5 min):
 * 1. Create a Google Sheet. Row 1 headers: email | wallet | x_handle | created_at
 * 2. Extensions → Apps Script → replace code with this file
 * 3. Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Authorize → copy Web app URL
 * 5. Vercel env: GOOGLE_SHEETS_WEBHOOK_URL=<that url>
 *    (Production + Preview)
 *
 * API:
 *   GET  ?action=count  → { count: N }
 *   POST body { email, wallet, x_handle, created_at } → { ok, alreadyJoined?, position }
 */

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function emailsSet_() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  var set = {};
  if (last < 2) return set;
  var vals = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var e = String(vals[i][0] || "")
      .trim()
      .toLowerCase();
    if (e) set[e] = true;
  }
  return set;
}

function count_() {
  var last = sheet_().getLastRow();
  return Math.max(0, last - 1); // minus header
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "count";
  if (action === "count") {
    return json_({ count: count_() });
  }
  return json_({ ok: true, count: count_() });
}

function doPost(e) {
  try {
    var body = JSON.parse((e.postData && e.postData.contents) || "{}");
    var email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!email) return json_({ ok: false, error: "email required" });

    var existing = emailsSet_();
    if (existing[email]) {
      return json_({ ok: true, alreadyJoined: true, position: count_() });
    }

    sheet_().appendRow([
      email,
      body.wallet || "",
      body.x_handle || "",
      body.created_at || new Date().toISOString(),
    ]);

    return json_({ ok: true, alreadyJoined: false, position: count_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
