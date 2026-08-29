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

## 4. Send me four things

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

## Status — 30 Aug 2026

**Blocked.** R2 isn't switched on yet: Cloudflare wants a card on file before
it will activate, even though the plan is $0/month at our usage. Waiting on the
boss to add one.

Nothing else can start until then. Steps 1–4 above resume the moment it's live.
