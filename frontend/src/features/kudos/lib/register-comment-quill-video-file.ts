import Quill from 'quill'

const BlockEmbed = Quill.import('blots/block/embed') as typeof import('quill/blots/block').BlockEmbed
const Link = Quill.import('formats/link') as { sanitize: (url: string) => string }

/** HTML5 &lt;video&gt; for direct MP4/WebM URLs (uploaded comment media). Distinct from Quill's iframe `video` format. */
class VideoFileBlot extends BlockEmbed {
  static blotName = 'videoFile'
  static className = 'ql-video'
  static tagName = 'VIDEO'

  static create(value: string) {
    const node = super.create() as HTMLVideoElement
    node.setAttribute('controls', 'true')
    node.setAttribute('playsinline', 'true')
    node.setAttribute('src', Link.sanitize(value))
    return node
  }

  static value(domNode: HTMLVideoElement) {
    return domNode.getAttribute('src') ?? ''
  }
}

let registered = false

export function registerCommentQuillVideoFileBlot() {
  if (registered) return
  Quill.register('formats/videoFile', VideoFileBlot)
  registered = true
}
