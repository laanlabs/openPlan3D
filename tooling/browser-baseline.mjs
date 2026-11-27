// The oldest browsers the built JavaScript and CSS are written for. This is Vite 7's default, kept through
// the move to Vite 8, whose default (Chrome 111, Firefox 114, Safari 16.4) leaves responsive CSS as media
// range queries. Safari 16.0 to 16.3 ignores those.
export const browserBaseline = ['chrome107', 'edge107', 'firefox104', 'safari16'];
