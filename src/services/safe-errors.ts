type SafeErrorContext =
  | 'auth-initialize'
  | 'auth-sign-in'
  | 'auth-oauth-sign-in'
  | 'auth-sign-up'
  | 'auth-reset-password'
  | 'auth-update-password'
  | 'cloud-hydrate'
  | 'cloud-sync'
  | 'cloud-file-upload'
  | 'cloud-material-delete'
  | 'material-ai-generation'
  | 'material-assisted-import'
  | 'material-file-import'
  | 'material-link-import'

const safeErrorCopy: Record<SafeErrorContext, string> = {
  'auth-initialize': 'We could not check your account status. You can keep studying locally and try again later.',
  'auth-sign-in': 'We could not sign you in. Check your email and password, then try again.',
  'auth-oauth-sign-in': 'We could not start social sign-in right now. Check that the provider is enabled, then try again.',
  'auth-sign-up': 'We could not create your account right now. Check your details and try again.',
  'auth-reset-password': 'We could not send a reset email right now. Try again in a few minutes.',
  'auth-update-password': 'We could not update your password right now. Try the recovery link again.',
  'cloud-hydrate': 'We could not load your cloud study data right now. Your local session is still available.',
  'cloud-sync': 'Cloud sync could not finish right now. Your changes are kept locally and will retry later.',
  'cloud-file-upload': 'We could not save that file to cloud storage right now.',
  'cloud-material-delete': 'We could not update that cloud material right now.',
  'material-ai-generation': 'AI generation is not available right now. We used local study-tool generation instead.',
  'material-assisted-import': 'We could not import that pasted study text. Check that it includes nursing terms, definitions, or notes, then try again.',
  'material-file-import': 'We could not import this file. Check the file type and try again.',
  'material-link-import': 'We could not import this link. Check the URL and try again.',
}

export const getSafeErrorCopy = (context: SafeErrorContext) => safeErrorCopy[context]

export const reportSafeError = (context: SafeErrorContext, error: unknown) => {
  if (!import.meta.env.DEV) return

  const detail =
    error && typeof error === 'object'
      ? {
          name: 'name' in error && typeof error.name === 'string' ? error.name : undefined,
          code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
          status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
        }
      : {}

  console.warn(`[safe-error:${context}]`, detail)
}
