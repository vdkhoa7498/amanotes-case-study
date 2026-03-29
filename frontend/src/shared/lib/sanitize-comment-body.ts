import DOMPurify from 'dompurify'

const COMMENT_SANITIZE = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'span',
    'img',
    'video',
  ],
  ALLOWED_ATTR: [
    'href',
    'target',
    'rel',
    'src',
    'alt',
    'class',
    'style',
    'controls',
    'playsinline',
    'width',
    'height',
  ],
}

export function sanitizeCommentBodyHtml(html: string): string {
  return DOMPurify.sanitize(html, COMMENT_SANITIZE) as string
}
