# alfredshingai.github.io — Alfred Shingai's portfolio

One canonical site: portfolio, case studies, and writing. Built as static HTML/CSS/JS — no framework, no build step. Deployed via GitHub Pages.

## Structure

```
index.html            Home — hero, skills, selected work, writing, story, contact
style.css             Design system + home styles (colors live in :root here)
assets/
  site.css            Shared styles for subpages (case studies, blog, 404)
  main.js             Shared JS (theme, nav, reveal, cursor, progress)
  cv/                 CV PDF
work/                 Case-study pages
  statlab-zim.html    StatLab Zim — build story
  sokodata.html       SokoData — build story
  who-builds-africa.html  Who Builds Africa — build story
  bank-churn.html     Bank churn — case study
  bike-sales.html     Bike sales — case study
  flight-status.html  Flight dashboard — case study
  cocacola-retail.html    Coca-Cola — case study
  kevin-cookie.html   Kevin Cookie — case study
blog/
  index.html          Writing index
  posts/*.html        Posts (static HTML, no markdown build step)
404.html              Not-found page
robots.txt, sitemap.xml
images/               Project screenshots
```

## Editing

- **Colors:** all tokens are CSS variables in `:root` at the top of `style.css`. Dark and light themes are defined side by side.
- **New case study:** copy any file in `work/`, update the content, add a card to `index.html#work`, and add the URL to `sitemap.xml`.
- **New post:** copy any file in `blog/posts/`, update the content, add a card to `blog/index.html` and the Writing section on the home page, and add the URL to `sitemap.xml`.
- Every page needs: the inline theme snippet in `<head>`, `style.css` + `assets/site.css`, and `assets/main.js` before `</body>`. Subpages adjust relative paths (`../`).

## Go live on a custom domain (.dev recommended)

1. In this repo: **Settings → Pages → Custom domain** → enter `alfredshingai.dev` (or your chosen domain) → Save. This creates a `CNAME` file in the repo — commit it.
2. At your registrar, add DNS records:
   - `A` records for the apex, pointing to GitHub Pages:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - `CNAME` record for `www` → `alfredshingai.github.io`.
3. Wait for DNS to propagate (minutes to a few hours), then in **Settings → Pages** tick **Enforce HTTPS**.
4. Update every `https://alfredshingai.github.io/...` canonical/OG/sitemap URL to the new domain (search the repo for `alfredshingai.github.io`).
5. Point the old `alfred619.github.io` repo at this one: either unpublish it, or replace its index with a redirect page to the canonical site (and add `<link rel="canonical">` pointing here if it must stay up).

## Live products linked from this site

- StatLab Zim — https://statlab-zim.streamlit.app
- SokoData — https://sokodata.onrender.com (docs at `/docs`)
- Who Builds Africa — https://who-builds-africa.vercel.app
