# Security notes

- Browser code contains only Appwrite Endpoint, Project ID, Function ID, Database ID and Bucket ID. These identifiers are not secrets.
- `.env` contains a privileged setup API key and is Git-ignored. Revoke that key after setup.
- The `records` collection has no direct client permissions. The Appwrite Function validates public, owner, approved-account and administrator access.
- Administrator status is derived from the authenticated Appwrite account email and the server-side `ADMIN_EMAIL` variable, not from client metadata.
- Uploaded files are owner-private by default. CV and company-proof preview uses short-lived Appwrite file tokens after server authorization.
- Advertisement banners become public only after administrator approval.
- Do not change the Function execution permission unless the public directory and signup API are redesigned.
- Keep Appwrite SDK and Function dependencies updated and review Function logs for repeated rejected requests.
