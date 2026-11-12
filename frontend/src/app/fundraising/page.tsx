import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fundraiser | GoodNews Merch' }

export default function FundraisingPage() {
  return (
    <div className="pb-14">
      {/* Hero */}
      <div className="bg-black py-14 px-4 sm:px-8 overflow-hidden">
      <div className="max-w-[760px] mx-auto">
        <h1 className="text-[28px] min-[400px]:text-[34px] sm:text-[48px] md:text-[72px]
          font-bold tracking-[0.12em] sm:tracking-[0.25em] md:tracking-[0.3em]
          text-white leading-none mb-5 break-words">
          FUNDRAISER
        </h1>
        <div className="w-[60px] h-[3px] bg-white" />
      </div>
    </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-4 sm:px-8 pt-12">
        <div className="flex flex-col gap-7 text-[16px] text-text-body leading-[1.9]">
          <p>
            There's a message the world needs to hear, and we believe it can travel
            further than a pulpit. It can walk into classrooms, markets, offices, and
            streets, carried on the backs of those who believe it.
          </p>
          <p>
            Goodnews Merch was born out of a simple act of faith. The youth of{' '}
            <strong className="text-text">CAC Goodnews Assembly</strong> needed to raise
            funds to upgrade their church's equipment, so they did what young, creative
            believers do: they designed, printed, and launched. But somewhere in the
            process, they discovered something bigger than a fundraiser — a mission.
          </p>
          <p>
            Because every shirt is a conversation. Every hoodie is a statement. Every
            print is a quiet but confident declaration that Christ is good news — and
            that good news is worth wearing.
          </p>
          <p>
            We are not just a merch brand. We are a movement of young Nigerians who
            refuse to keep their faith confined to four walls. We believe style and
            scripture can coexist beautifully. That you can be fashionable and
            faith-filled. That what you wear can reflect what you believe, and spark
            something in someone who needs to hear it.
          </p>

          {/* The Need */}
          <div className="bg-section-bg p-6 my-2">
            <h3 className="text-[13px] font-bold tracking-[0.15em] uppercase text-text mb-4">
              THE NEED
            </h3>
            <p className="mb-4">
              CAC Goodnews Assembly is a growing congregation of believers in Lagos,
              Nigeria. To serve better — in worship, in community, and in outreach —
              they need:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-2 text-[15px]">
              <li>Sound and multimedia equipment upgrades</li>
              <li>Seating and interior improvements</li>
              <li>Outreach and youth programme funding</li>
            </ul>
          </div>

          {/* How to Give */}
          <div>
            <h3 className="text-[13px] font-bold tracking-[0.15em] uppercase text-text mb-4">
              HOW TO GIVE
            </h3>
            <p className="mb-4">
              You can support this cause through a direct bank transfer:
            </p>
            <div className="bg-section-bg p-6 font-mono text-[14px] flex flex-col gap-2">
              <div><span className="text-text-muted">Bank:</span> Moniepoint MFB</div>
              <div><span className="text-text-muted">Account Name:</span> Goodnews Merch Ventures </div>
              <div><span className="text-text-muted">Account Number:</span> 9167652614</div>
            </div>
            <p className="mt-4 text-[14px]">
              After donating, send your name and amount to{' '}
              <a href="mailto:info@goodnewsmerch@zohomail.com"
                className="font-semibold underline text-text">
                info.goodnewsmerch@zohomail.com
              </a>{' '}
              so we can acknowledge your generosity.
            </p>
          </div>

          <blockquote className="border-l-[3px] border-black pl-5 italic text-text mt-4">
            <p>So wear it with purpose. Give with intention.</p>
            <p className="font-bold not-italic mt-1">
              Wear the message. Share the good news.
            </p>
          </blockquote>
        </div>

        <div className="mt-12">
          <Link href="/shop"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4
              text-[12px] font-bold tracking-[0.15em] uppercase border-2 border-black
              hover:bg-[#2a2a2a] transition-colors">
            SHOP & GIVE BACK
          </Link>
        </div>
      </div>
    </div>
  )
}
