# Ananta Kumar Mohanta — Portfolio

Personal site for a senior data & analytics professional working in banking data migration, governance, risk, and automation.

## Live site (one-time setup)

### GitHub Pages

1. Open **Settings → Pages** in this repo.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually under **Actions**).

After the workflow finishes, the site is published at:

**https://ananta126.github.io/AI-fun-projects/**

### Netlify

1. Go to [app.netlify.com/start](https://app.netlify.com/start) and import this GitHub repo.
2. Use the defaults (no build command; publish directory is `.` via `netlify.toml`).
3. Click **Deploy**.

Netlify assigns a URL like `https://<random-name>.netlify.app`. You can add a custom domain later.

## Local preview

> `localhost` in your browser only works if the server runs on **your** machine — not in a cloud agent VM.

```bash
git clone https://github.com/ananta126/AI-fun-projects.git
cd AI-fun-projects
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Or open `index.html` directly in a browser (no server required).

## Files

- `index.html` — main page
- `css/styles.css`, `js/main.js` — styles and navigation
- `assets/Ananta_Mohanta_Resume.pdf` — downloadable résumé
