# Suggested Supabase Auth email settings

## Site URL
Set the Site URL to your final Cloudflare Pages domain, for example:
`https://prepresshub.pages.dev`

## Redirect URLs
Add both:
- `http://localhost:8788/**`
- `https://prepresshub.pages.dev/**`
- Your custom domain, if used: `https://prepresshub.com/**`

Keep email confirmation enabled for production.
The browser temporarily stores the selected signup CV/proof file in IndexedDB and uploads it after the user confirms the email and returns to the same browser. If they confirm from another device, they can upload the file again from the Account page.
