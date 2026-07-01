const publicLaunchPaths = new Set(['/pricing', '/nclex-rn', '/nclex-pn', '/about', '/privacy', '/terms'])

const normalizePath = (pathname: string) => {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

export const isPublicLaunchPath = (pathname: string) => publicLaunchPaths.has(normalizePath(pathname))
