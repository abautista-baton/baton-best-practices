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

## Images and text styling

- **Logo:** in `/edit`, the "Upload logo" bar sits just under the header logo. Upload the **white (light) version** of the Baton logo, because the header and footer are dark. PNG with a transparent background or SVG works best. Use the Size slider to adjust, or "Use default" to go back to the drawn placeholder.
- **Account manager photos:** each team member has an "Add photo" button (or click the circle). Use the Position slider to move the photo up or down inside the circle. Remove photo returns to the letter circle.
- **Hero background image:** "Add background image" at the bottom of the header. Use the Darkness slider to keep the headline readable.
- **Image sections:** "Add a section → Image" adds a full image block with optional heading and caption. Set the width (Narrow / Wide / Full width) and background in the section toolbar. Fill in the image description for accessibility.
- **Text style:** click any text and the **Text style** bar appears above the Save bar. Pick a color, set opacity (100% to 40%), toggle bold, or press **Reset style**. Styles stay with their text when you move or duplicate items and sections. Leave color on Automatic when you want the text to adapt to light and dark mode.
- **Link words inside text:** select any words in any paragraph or heading, then press **Link** in the Text style bar. Put your cursor inside an existing link to change or remove it. (Buttons and standalone links keep the round link icon.)
- **Undo / Redo:** the Undo and Redo buttons in the editor bar reverse moves, deletes, uploads and style changes made since you opened the editor.
- Uploaded images are resized in the browser before upload (PNG, JPG, WebP, GIF, SVG; about 4 MB limit) and stored in Netlify Blobs.

## Changing the password
Change `EDIT_PASSWORD` in Netlify's environment variables and trigger a new deploy.

## Good to know
- One shared password, no individual accounts and no edit history beyond the single "previous" version.
- Content is stored in Netlify Blobs (built into Netlify, no setup).
- Use a long, unique password and share it only with people who should edit.
