export default function Footer() {
  return (
    <footer className="bg-white border-t border-border py-10 px-4 sm:px-8">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1.5fr] gap-8 md:gap-10">
        <div>
          <p className="text-[14px] font-bold tracking-[0.2em] text-text mb-2">GOODNEWS MERCH</p>
          <p className="text-[11px] text-text-muted tracking-wide uppercase">
            24, Majaro Street, Pero Bus Stop, Agege, Lagos State.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-text-sub uppercase mb-4">Social</p>
          <ul className="flex flex-col gap-2">
            {[
              ['Instagram', 'https://www.instagram.com/goodnews.merch'],
              ['Facebook',  'https://www.facebook.com/goodnews.merch'],
              ['TikTok',    'https://www.tiktok.com/@goodnewsmerch'],
              ['YouTube',   '#'],
              ['Twitter',   'https://x.com/goodnews_merch'],
            ].map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener"
                  className="text-[12px] text-text-muted tracking-wide hover:text-text transition-colors">
                  {label.toUpperCase()}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-text-sub uppercase mb-4">Legal</p>
          <ul className="flex flex-col gap-2">
            <li><a href="/terms"   className="text-[12px] text-text-muted tracking-wide hover:text-text transition-colors">TERMS</a></li>
            <li><a href="/privacy" className="text-[12px] text-text-muted tracking-wide hover:text-text transition-colors">PRIVACY</a></li>
          </ul>
        </div>
        <div className="flex items-end justify-start md:justify-end">
          <p className="text-[11px] text-text-muted tracking-wide">
            &copy; {new Date().getFullYear()} GOODNEWS MERCH. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  )
}
