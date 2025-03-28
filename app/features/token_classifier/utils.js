export function classifyTokens(userInput) {
    const tokens = userInput.split(/\s+/);
    const classifications = {};
    tokens.forEach(token => {
        classifications[token] = /^[A-Za-z]+$/.test(token) ? 'keyword' : 'number';
    });
    return classifications;
}
