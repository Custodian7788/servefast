import MsgReader from "@kenjiuno/msgreader";

// Turns a dropped file into plain text. Outlook .msg and .eml messages come
// out as a readable header block plus the message body, so the search works on
// what the email actually says rather than on its encoding.

export function htmlToText(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, head").forEach((n) => n.remove());
  doc.querySelectorAll("br").forEach((n) => n.replaceWith("\n"));
  doc.querySelectorAll("p, div, tr, li, h1, h2, h3, h4, h5, h6").forEach((n) => {
    n.append("\n");
  });
  return (doc.body?.textContent || "")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function headerBlock({ from, to, date, subject }) {
  const lines = [];
  if (from) lines.push(`From: ${from}`);
  if (to) lines.push(`To: ${to}`);
  if (date) lines.push(`Date: ${date}`);
  if (subject) lines.push(`Subject: ${subject}`);
  return lines.join("\n");
}

function joinParts(header, body) {
  return [header, body].filter(Boolean).join("\n\n").trim();
}

// ---- Outlook .msg -------------------------------------------------------

export function parseMsg(arrayBuffer) {
  const data = new MsgReader(arrayBuffer).getFileData();
  if (!data || data.error) throw new Error(data?.error || "unreadable .msg");

  const sender = [data.senderName, data.senderEmail].filter(Boolean).join(" ");
  const to = (data.recipients || [])
    .map((r) => [r.name, r.email].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  const body = data.body || htmlToText(data.bodyHtml);

  return joinParts(
    headerBlock({
      from: sender,
      to,
      date: data.messageDeliveryTime || data.clientSubmitTime,
      subject: data.subject,
    }),
    body
  );
}

// ---- .eml ---------------------------------------------------------------

function decodeQuotedPrintable(input) {
  const bytes = [];
  const text = input.replace(/=\r?\n/g, "");
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "=" && /[0-9A-Fa-f]{2}/.test(text.slice(i + 1, i + 3))) {
      bytes.push(parseInt(text.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(text.charCodeAt(i));
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
}

function decodeBase64(input) {
  try {
    const binary = atob(input.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return "";
  }
}

// Subject: =?utf-8?B?...?= and friends.
function decodeWords(value) {
  return value.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, kind, payload) => {
    const text = kind.toUpperCase() === "B" ? decodeBase64(payload) : decodeQuotedPrintable(payload.replace(/_/g, " "));
    return text || payload;
  });
}

function splitHeaders(section) {
  const breakAt = section.search(/\r?\n\r?\n/);
  const rawHeaders = breakAt === -1 ? section : section.slice(0, breakAt);
  const body = breakAt === -1 ? "" : section.slice(breakAt).replace(/^\r?\n\r?\n/, "");

  const headers = {};
  rawHeaders
    .replace(/\r?\n[ \t]+/g, " ")
    .split(/\r?\n/)
    .forEach((line) => {
      const at = line.indexOf(":");
      if (at > 0) headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
    });

  return { headers, body };
}

function decodeBody(headers, body) {
  const encoding = (headers["content-transfer-encoding"] || "").toLowerCase();
  if (encoding === "base64") return decodeBase64(body);
  if (encoding === "quoted-printable") return decodeQuotedPrintable(body);
  return body;
}

// Walks a MIME tree and returns the best readable body it can find.
function bestBody(section) {
  const { headers, body } = splitHeaders(section);
  const type = (headers["content-type"] || "text/plain").toLowerCase();

  const boundary = /boundary="?([^";]+)"?/i.exec(headers["content-type"] || "")?.[1];
  if (boundary) {
    const parts = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(--)?\\r?\\n?`));
    const found = parts.map((p) => bestBody(p)).filter(Boolean);
    const plain = found.find((f) => f.kind === "text");
    return plain || found[0] || null;
  }

  if (type.startsWith("text/plain")) return { kind: "text", text: decodeBody(headers, body).trim() };
  if (type.startsWith("text/html")) return { kind: "html", text: htmlToText(decodeBody(headers, body)) };
  return null;
}

export function parseEml(raw) {
  const { headers } = splitHeaders(raw);
  const found = bestBody(raw);

  return joinParts(
    headerBlock({
      from: decodeWords(headers.from || ""),
      to: decodeWords(headers.to || ""),
      date: headers.date || "",
      subject: decodeWords(headers.subject || ""),
    }),
    found?.text || ""
  );
}

// ---- entry point --------------------------------------------------------

export async function readFileAsText(file) {
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".msg")) return parseMsg(await file.arrayBuffer());
  if (name.endsWith(".eml")) return parseEml(await file.text());
  if (name.endsWith(".html") || name.endsWith(".htm")) return htmlToText(await file.text());
  return file.text();
}
