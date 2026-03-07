export function createPageUrl(pageName: string | unknown): string {
    // Guard: if an object/undefined is accidentally passed (e.g. from a misconfigured
    // nav item), return '/' rather than producing "/[object Object]" which causes a
    // 404 page with a confusing error message.
    if (!pageName || typeof pageName !== 'string') {
        console.warn('[createPageUrl] received non-string argument:', pageName);
        return '/';
    }
    return '/' + pageName.replace(/ /g, '-');
}
