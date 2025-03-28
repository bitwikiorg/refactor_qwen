export function classifyToken(token) {
    if (!token) return 'Invalid';
    return token.length > 5 ? 'LongToken' : 'ShortToken';
}
