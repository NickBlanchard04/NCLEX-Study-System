export const BETA_TERMS_VERSION = 'open-beta-2026-06-24'

export const BETA_TERMS_EMAIL_COPY = `Nurse Command Open Beta Terms
Version: open-beta-2026-06-24

1. Open beta status
Nurse Command is currently in open beta. Features, content, analytics, and availability may change while the product is tested and improved.

2. Study support only
Nurse Command is study support for nursing education and exam preparation. It is not clinical advice, patient care guidance, licensure prediction, or a substitute for official exam guidance.

3. Personal beta access
Beta access is personal to the account holder. Users may not copy, scrape, reverse engineer, resell, redistribute, or use Nurse Command content, interfaces, study logic, or product patterns to train or build competing systems.

4. Privacy boundary
Cloud accounts store email and synced study activity. Users should not upload protected health information, patient-identifying data, or clinical records.

5. Changes and support
These beta terms may be updated as Nurse Command evolves. For account, privacy, or support questions, contact support@nursecommand.com.`

export interface BetaTermsConsent {
  acceptedAt: string
  emailCopyRequested: boolean
  version: string
}

export const createBetaTermsConsent = (emailCopyRequested: boolean): BetaTermsConsent => ({
  acceptedAt: new Date().toISOString(),
  emailCopyRequested,
  version: BETA_TERMS_VERSION,
})
