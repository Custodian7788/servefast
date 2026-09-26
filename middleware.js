export const config = {
  matcher: "/((?!_vercel|favicon.svg|robots.txt).*)",
};

const COOKIE = "sf_open";

function password() {
  return process.env.SITE_PASSWORD || "wasabi";
}

// A short token so the cookie never carries the password itself.
async function token() {
  const data = new TextEncoder().encode(`servefast:${password()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function gate(wrong) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Servefast</title>
<style>
  html,body{height:100%}
  body{margin:0;display:flex;align-items:center;justify-content:center;background:#FBF5E9;
       font:400 13px ui-sans-serif,system-ui,sans-serif;color:#332E2A}
  input{width:220px;padding:7px 10px;font:inherit;background:#fff;border:2px solid ${wrong ? "#C0392B" : "#332E2A"};
        border-radius:4px;outline:none}
</style></head>
<body>
  <form method="POST" action="/__unlock">
    <input type="password" name="p" autofocus autocomplete="current-password" />
  </form>
</body></html>`;
  return new Response(html, {
    status: wrong ? 401 : 200,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex, nofollow" },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const good = await token();

  if (url.pathname === "/__unlock" && request.method === "POST") {
    const body = await request.formData();
    if (body.get("p") === password()) {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie": `${COOKIE}=${good}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
        },
      });
    }
    return gate(true);
  }

  const cookie = request.headers.get("cookie") || "";
  if (cookie.split(";").some((c) => c.trim() === `${COOKIE}=${good}`)) return;

  return gate(false);
}
