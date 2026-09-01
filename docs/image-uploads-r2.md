# Cloudflare R2 — what Ridwan needs to do

Everything else is mine. This page is only your part.

You should be done in about five minutes.

---

## 1. Make the bucket

Cloudflare dashboard → **R2** in the left sidebar → **Create bucket**.

- Name: `healthflow-media`
- Location: leave as Automatic
- Everything else: leave alone

Create it.

---

## 2. Let the public read it

Open the bucket → **Settings** tab → find **Public access** → enable the
`r2.dev` subdomain. Cloudflare will ask you to confirm.

It gives you an address like `https://pub-xxxxxxxx.r2.dev`. **Copy it.**

> Hospital logos go on the public website, so there's nothing to hide here.
> We're not using a custom domain yet — I've built it so we can switch to one
> later without breaking anything already saved.

---

## 3. Make a token so the app can write

R2 main page → **Manage API Tokens** (top right) → **Create API Token**.

- Name: `healthflow-app`
- Permission: **Object Read & Write**
- Bucket: `healthflow-media` only, not all buckets
- TTL / expiry: leave as forever

Create it. The next screen shows the secrets **once** — leave that tab open
until you've pasted them below.

---

## 4. Let the app upload to it (CORS)

**This step is new** — I missed it when I first wrote this page. The browser
uploads straight to Cloudflare, so Cloudflare has to be told our site is
allowed to do that. Without it the upload fails in the browser with a CORS
error and nothing reaches the bucket.

Bucket → **Settings** → **CORS Policy** → **Add CORS policy**, and paste:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://healthflowbd.com"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

> Add whatever the real production domain turns out to be. A missing origin
> here is the likeliest reason an upload fails once everything else is right.

---

## 5. Send me four things

Paste these to me, or straight into `.env.local`:

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
NEXT_PUBLIC_R2_PUBLIC_URL=
```

Where each one is:

| | Where it's from |
|---|---|
| `R2_ACCOUNT_ID` | the R2 page, right-hand side, or the long code in the dashboard address bar |
| `R2_ACCESS_KEY_ID` | the token screen from step 3 |
| `R2_SECRET_ACCESS_KEY` | the token screen from step 3 — shown once only |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | the `https://pub-….r2.dev` address from step 2 |

**That's you done.** I'll do the rest.

---

## What happens after you send them

Mine, not yours — listed so you can see where it's up to:

1. Upload endpoint — the server decides what's allowed to be uploaded
2. Drop zone component — drag a file on, see it upload
3. Hospital logo field added to the create/edit form
4. Test it, then QA

Then the same drop zone gets reused for doctor photos and cover images.

---

## Decisions I made, so nobody reopens them

- **No database change.** The columns already hold text. Nothing to migrate —
  I checked, and no image has ever been uploaded.
- **We save the file's name, not the full web address.** The address is built
  when the image is shown. This is what lets us move to a custom domain later
  by changing one setting instead of rewriting saved data. The 18 Unsplash
  links already in the database keep working — anything starting with `http`
  is used as-is.
- **Public bucket.** Logos are on the public site. Private files — patient
  documents and the like — are a different problem needing expiring links, and
  get their own ticket later.
- **The file goes browser → Cloudflare directly**, never through our server, so
  a big upload can't slow the app down.

---

## Status — 1 Sep 2026

**Done. Uploads work end to end.**

Steps 1–5 above are no longer yours to do — they were done on 1 Sep:

| | |
|---|---|
| Bucket | `healthflow-media`, Asia-Pacific (APAC) |
| Public URL | enabled, `https://pub-a30329800aeb450fbaa319178f53aab1.r2.dev` |
| CORS | `PUT` + `GET` from localhost:3000/3001/3002, header `content-type` |
| Token | account token `healthflow-app`, Object Read & Write, this bucket only, no expiry |
| `.env.local` | all four values set (gitignored, as is the whole `.env*` family) |

Proven rather than assumed: presigned a PUT, uploaded a 1×1 PNG, fetched it
back from the public URL — 200, `image/png`, 70 bytes out and 70 back. The
test object was deleted afterwards; the bucket is empty.

### Two things still outstanding

**Production origin is not in the CORS policy.** Only the three localhost
ports are, because the production domain was not known when this was set up.
Uploading from the deployed site will fail with a CORS error until it is
added — bucket → Settings → CORS Policy → Edit.

**`r2.dev` is a development URL.** Cloudflare rate-limits it and says so on
the settings page; Cache and Access do not apply to it. That is fine for now
and is exactly why nothing stores a full URL — moving to a custom domain is a
change to `NEXT_PUBLIC_R2_PUBLIC_URL` and nothing else.

### Still not done, deliberately

Doctor photos and `cover_image_url` are one line each now that the widget
works. The announcement image on `/super/announcements` still writes base64 —
it has its own picker rather than the shared one. Private files (patient
documents) still need their own bucket and expiring links.
