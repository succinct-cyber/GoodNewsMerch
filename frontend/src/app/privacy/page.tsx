import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy | GoodNews Merch' }

export default function PrivacyPage() {
  return (
    <section className="py-12">
      <div className="max-w-[760px] mx-auto px-4 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-[0.2em] uppercase mb-4 pb-4
          border-b-2 border-black">
          PRIVACY POLICY
        </h1>
        <p className="text-[14px] text-text-muted mb-10">Last updated: April 2026</p>

        {[
          ['INFORMATION WE COLLECT', `We collect your name, email address, phone number, and delivery
            address when you place an order or create an account. We also collect payment transaction
            references (we never store card details).`],
          ['HOW WE USE IT', `Your information is used solely to process and deliver your orders, send
            order confirmation and status emails, and respond to enquiries. We do not sell or share
            your data with third parties except payment processors (Flutterwave) and our email
            provider (Brevo).`],
          ['COOKIES', `We use session cookies to manage your cart and login state. No tracking or
            advertising cookies are used.`],
          ['YOUR RIGHTS', `You may request deletion of your account and data at any time by emailing
            info@goodnewsmerch.store.`],
          ['CONTACT', `For privacy-related enquiries, contact info.goodnewsmerch@zohomail.com.`],
        ].map(([title, body]) => (
          <div key={title} className="mb-8">
            <h3 className="text-[13px] font-bold tracking-[0.15em] uppercase mb-3">{title}</h3>
            <p className="text-[15px] text-text-body leading-[1.8]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
