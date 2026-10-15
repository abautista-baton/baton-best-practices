# Baton Best Practices: editable site

Two links, one site:

| Link | Who | What |
|---|---|---|
| `https://YOUR-SITE.netlify.app/` | Anyone | View only |
| `https://YOUR-SITE.netlify.app/edit` | Anyone with the password | Edit text, links, order and layout |

The password is checked on the server (a Netlify Function). It is never stored in the page or in this repo.

## Deploy (about 10 minutes)

Use **GitHub + Netlify**. (Netlify's drag-and-drop "Netlify Drop" can't install the one dependency this site needs, so it won't work for this version.)

1. Create a new **private** GitHub repository and upload everything in this folder (keep the folder structure: `public/`, `netlify/`, `netlify.toml`, `package.json`).
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo. Leave build settings as they are; `netlify.toml` already has them.
3. **Before the first deploy** (or right after, then redeploy): **Site configuration → Environment variables → Add a variable**
   - Key: `EDIT_PASSWORD`
   - Value: the password you want your editors to use (use a long one)
4. Deploy. Open `/edit`, log in, make a change, press **Save changes**, then open the plain site link in a private window to confirm it's live.

### Command-line alternative
```
npm install
npm install -g netlify-cli
netlify login
netlify init
netlify env:set EDIT_PASSWORD "your-long-password"
netlify deploy --prod
```

## Using the editor (`/edit`)

- **Edit text:** click any text and type. Pressing Enter does nothing (one block of text per field).
- **Links:** click the round link icon next to any button or link. Paste a web address, an email, or choose a part of this page.
- **Rearrange:** use the toolbar on each section (Up, Down, Hide, Duplicate, Delete) and the small arrows on items inside a section (methods, checklist tips, team members, paragraphs, buttons).
- **Add:** "+ Add" buttons add items inside sections; "Add a section" at the bottom adds whole new sections (text, checklist, team, etc.). Text sections can be white, light blue or navy.
- **Save changes** publishes to the live site. **Discard** reloads what is live. **Restore previous** loads the version from before the last save (you still press Save to publish it). **Reset to original** loads the starting content.
- If two people edit at once, the second person to save is asked before overwriting.

The layout stays responsive because you change content and order, not pixel positions.

## Changing the password
Change `EDIT_PASSWORD` in Netlify's environment variables and trigger a new deploy.

## Good to know
- One shared password, no individual accounts and no edit history beyond the single "previous" version.
- Content is stored in Netlify Blobs (built into Netlify, no setup).
- Use a long, unique password and share it only with people who should edit.
