import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact | GoodNews Merch' }

export default function ContactPage() {
  return (
    <section className="py-12">
      <div className="max-w-[760px] mx-auto px-4 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-[0.2em] uppercase mb-4 pb-4
          border-b-2 border-black">
          CONTACT US
        </h1>

        <div className="bg-section-bg p-6 my-8">
          <p className="mb-2 text-[14px]">
            <strong>Email:</strong>{' '}
            <a href="mailto:info.goodnewsmerch@zohomail.com"
              className="underline hover:opacity-70 transition-opacity">
              info.goodnewsmerch@zohomail.com
            </a>
          </p>
          <p className="mb-2 text-[14px]">
            <strong>Address:</strong> 24, Majaro Street, Pero Bus Stop, Agege, Lagos State.
          </p>
          <p className="text-[14px]">
            <strong>Instagram:</strong>{' '}
            <a href="https://www.instagram.com/goodnews.merch" target="_blank"
              rel="noopener" className="underline hover:opacity-70 transition-opacity">
              @goodnews.merch
            </a>
          </p>
          <p className="text-[14px]">
            <strong>TikTok:</strong>{' '}
            <a href="https://www.tiktok.com/@goodnewsmerch" target="_blank"
              rel="noopener" className="underline hover:opacity-70 transition-opacity">
              @goodnewsmerch
            </a>
          </p>
          <p className="text-[14px]">
            <strong>Twitter:</strong>{' '}
            <a href="https://www.x.com/goodnews_merch" target="_blank"
              rel="noopener" className="underline hover:opacity-70 transition-opacity">
              @goodnews_merch
            </a>
          </p>


        </div>

        <p className="text-[14px] text-text-body leading-relaxed">
          For order issues, returns, or general enquiries — reach out via email or DM
          us on Instagram. We typically respond within 24 hours on business days.
        </p>
      </div>
    </section>
  )
}
