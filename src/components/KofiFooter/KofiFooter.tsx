export function KofiFooter() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '10px 16px',
      backgroundColor: '#13131f',
      borderTop: '1px solid #3a3a5e',
    }}>
      <a
        href="https://ko-fi.com/codingajae119"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#64748b',
          textDecoration: 'none',
          fontSize: '1em',
          fontWeight: 'bold',
        }}
      >
        ☕ Buy me a coffee
      </a>
    </footer>
  )
}
