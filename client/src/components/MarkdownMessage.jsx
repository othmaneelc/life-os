import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownMessage({ content }) {
  if (!content) return null
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
      code({ inline, className, children }) {
        if (inline) {
          return <code className="px-1 py-0.5 rounded text-micro" style={{ background: 'var(--bg-elevated)', color: 'var(--accent)' }}>{children}</code>
        }
        return (
          <pre className="my-2 p-3 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
            <code className="text-micro">{children}</code>
          </pre>
        )
      },
      p({ children }) { return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p> },
      ul({ children }) { return <ul className="mb-2 space-y-1 list-disc list-inside">{children}</ul> },
      ol({ children }) { return <ol className="mb-2 space-y-1 list-decimal list-inside">{children}</ol> },
      li({ children }) { return <li>{children}</li> },
      strong({ children }) { return <strong className="font-semibold">{children}</strong> },
      em({ children }) { return <em>{children}</em> },
      h1({ children }) { return <h1 className="text-body font-bold mb-2 mt-3 first:mt-0">{children}</h1> },
      h2({ children }) { return <h2 className="text-subheading font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2> },
      h3({ children }) { return <h3 className="text-small font-semibold mb-1 mt-2 first:mt-0">{children}</h3> },
      blockquote({ children }) {
        return (
          <blockquote className="my-2 pl-3 py-1 rounded-r-xl" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--bg-surface)' }}>
            {children}
          </blockquote>
        )
      },
      hr() { return <hr className="my-3" style={{ borderColor: 'var(--border-color)' }} /> },
      a({ href, children }) {
        return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }} className="underline hover:opacity-80">{children}</a>
      },
      table({ children }) {
        return (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-micro" style={{ borderCollapse: 'collapse' }}>{children}</table>
          </div>
        )
      },
      th({ children }) { return <th className="px-2 py-1 text-left font-semibold" style={{ borderBottom: '1px solid var(--border-color)' }}>{children}</th> },
      td({ children }) { return <td className="px-2 py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>{children}</td> },
    }}>
      {content}
    </ReactMarkdown>
  )
}
