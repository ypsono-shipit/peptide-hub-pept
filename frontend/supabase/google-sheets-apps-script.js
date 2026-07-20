/**
 * PEPT waitlist + redemption → Google Sheet (durable, free)
 *
 * Setup:
 * 1. Google Sheet with two tabs (or one — script creates "Redemptions" if missing):
 *    - Sheet 1 (default): waitlist
 *      headers: email | wallet | x_handle | source | created_at
 *    - Sheet "Redemptions":
 *      headers: order_id | email | wallet | kits | vials | sema_required | full_name |
 *               institution | address1 | address2 | city | state_region | postal_code |
 *               country | phone | notes | status | created_at
 * 2. Extensions → Apps Script → paste this file
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Vercel: GOOGLE_SHEETS_WEBHOOK_URL=<web app url>
 *
 * API:
 *   GET  ?action=count  → { count }  (waitlist rows)
 *   POST waitlist body  → { ok, alreadyJoined?, position }
 *   POST redeem body { type:"redeem", ... } → { ok, orderId } + confirmation email
 */

var REDEEM_SHEET = "Redemptions";
// Optional: also notify ops
var OPS_EMAIL = ""; // e.g. "you@pept.trade"

function waitlistSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function redeemSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(REDEEM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(REDEEM_SHEET);
    sh.appendRow([
      "order_id",
      "email",
      "wallet",
      "kits",
      "vials",
      "sema_required",
      "full_name",
      "institution",
      "address1",
      "address2",
      "city",
      "state_region",
      "postal_code",
      "country",
      "phone",
      "notes",
      "status",
      "created_at",
    ]);
  }
  return sh;
}

function emailsSet_() {
  var sheet = waitlistSheet_();
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
  var last = waitlistSheet_().getLastRow();
  return Math.max(0, last - 1);
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
    var type = String(body.type || body.action || "waitlist").toLowerCase();

    if (type === "redeem") {
      return handleRedeem_(body);
    }
    return handleWaitlist_(body);
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function handleWaitlist_(body) {
  var email = String(body.email || "")
    .trim()
    .toLowerCase();
  if (!email) return json_({ ok: false, error: "email required" });

  var existing = emailsSet_();
  if (existing[email]) {
    return json_({ ok: true, alreadyJoined: true, position: count_() });
  }

  waitlistSheet_().appendRow([
    email,
    body.wallet || "",
    body.x_handle || "",
    body.source || "",
    body.created_at || new Date().toISOString(),
  ]);

  return json_({ ok: true, alreadyJoined: false, position: count_() });
}

function handleRedeem_(body) {
  var email = String(body.email || "")
    .trim()
    .toLowerCase();
  var wallet = String(body.wallet || "").trim();
  var kits = Number(body.kits || 0);
  var orderId = String(body.order_id || "").trim();

  if (!email) return json_({ ok: false, error: "email required" });
  if (!wallet) return json_({ ok: false, error: "wallet required" });
  if (!kits || kits < 1) return json_({ ok: false, error: "kits must be >= 1" });
  if (!orderId) orderId = "RDM-" + Date.now();

  var vials = Number(body.vials || kits * 10);
  var sema = Number(body.sema_required || kits * 10);

  redeemSheet_().appendRow([
    orderId,
    email,
    wallet,
    kits,
    vials,
    sema,
    body.full_name || "",
    body.institution || "",
    body.address1 || "",
    body.address2 || "",
    body.city || "",
    body.state_region || "",
    body.postal_code || "",
    body.country || "",
    body.phone || "",
    body.notes || "",
    body.status || "pending_fulfillment",
    body.created_at || new Date().toISOString(),
  ]);

  // Confirmation email to requester
  try {
    var subject = "PEPT redemption request received — " + orderId;
    var lines = [
      "Thanks for requesting a PEPT research kit redemption.",
      "",
      "Order ID: " + orderId,
      "Kits: " + kits + " ( = " + vials + " vials )",
      "SEMA required: " + sema + " tokens (10 SEMA per kit)",
      "Wallet: " + wallet,
      "",
      "Ship to:",
      body.full_name || "",
      body.institution || "",
      body.address1 || "",
      body.address2 || "",
      [body.city, body.state_region, body.postal_code].filter(Boolean).join(", "),
      body.country || "",
      "",
      "What happens next:",
      "1. We verify your SEMA balance and research request.",
      "2. Fulfillment is handled manually by the PEPT team (not instant).",
      "3. Research Only kits ship in batches — research use only, not for human consumption.",
      "",
      "You will get another email when your order is approved / shipped.",
      "",
      "— pept.trade",
    ];
    MailApp.sendEmail({
      to: email,
      subject: subject,
      body: lines.join("\n"),
    });

    if (OPS_EMAIL) {
      MailApp.sendEmail({
        to: OPS_EMAIL,
        subject: "[PEPT] New redemption " + orderId,
        body: lines.join("\n"),
      });
    }
  } catch (mailErr) {
    // Still ok if mail fails — order is on the sheet
    Logger.log("mail failed: " + mailErr);
  }

  return json_({ ok: true, orderId: orderId });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
