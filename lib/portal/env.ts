export function getPortalJwtSecret() {
  const secret = process.env.PORTAL_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "PORTAL_JWT_SECRET deve existir e ter pelo menos 32 caracteres.",
    );
  }

  return secret;
}
