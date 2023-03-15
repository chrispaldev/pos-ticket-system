import { readFileSync } from 'fs';

export const accessJwtConfig = {
  publicKey: readFileSync('keys/public.key'),
  privateKey: readFileSync('keys/private.key'),
  signOptions: { algorithm: 'ES256' as const, expiresIn: '2h' },
  verifyOptions: { algorithms: ['ES256' as const] },
};

export const refreshJwtConfig = {
  publicKey: readFileSync('keys/rpublic.key'),
  privateKey: readFileSync('keys/rprivate.key'),
  signOptions: { algorithm: 'ES256' as const, expiresIn: '90d' },
  verifyOptions: { algorithms: ['ES256' as const] },
  ignoreExpiration: true,
};
