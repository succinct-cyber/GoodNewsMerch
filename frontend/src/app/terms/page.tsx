import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms & Conditions | GoodNews Merch' }

export default function TermsPage() {
  return (
    <section className="py-12">
      <div className="max-w-[760px] mx-auto px-4 sm:px-8">
        <h1 className="text-[28px] font-bold tracking-[0.2em] uppercase mb-4 pb-4
          border-b-2 border-black">
          TERMS &amp; CONDITIONS
        </h1>
        <p className="text-[14px] text-text-muted mb-10">Last updated: April 2026</p>

        {[
          ['1. GENERAL', `By accessing and placing an order on GoodNews Merch, you confirm that you
            are in agreement with and bound by these terms. GoodNews Merch is an independent
            merchandise business that sells and fulfils all listed products directly.`],
          ['2. ORDERS', `All orders are subject to product availability. We reserve the right to refuse
            or cancel any order at our discretion. You will be notified and fully refunded if your
            order cannot be fulfilled.`],
          ['3. PAYMENT', `All payments are processed securely via Flutterwave. We accept cards, bank
            transfer, and USSD. All prices are listed in Nigerian Naira (₦). Payments made on this
            website are strictly for the purchase of merchandise sold by GoodNews Merch. GoodNews Merch
            independently donates a portion of its business revenue to CAC Goodnews Assembly after
            sales are completed. This is a business decision made post-transaction and does not affect
            the amount customers pay.`],
          ['4. DELIVERY', `All orders are processed within 1–2 business days. Estimated delivery is
            3–5 business days within Nigeria. Delivery timelines may vary by location and during peak
            periods.`],
          ['5. RETURNS & REFUNDS', `We accept return requests within 7 days of delivery for defective
            or incorrect items. Items must be unworn, unwashed, and in original condition. Contact
            info@goodnewsmerch.store with your order number. Approved refunds are processed within
            5–7 business days. We do not accept returns for change-of-mind purchases.`],
          ['6. CANCELLATIONS', `Orders may be cancelled within 12 hours of placement at no charge.
            Once processed or dispatched, cancellation is not possible.`],
          ['7. CONTACT', `For any issues or enquiries, contact info.goodnewsmerch@zohomail.com.`],
        ].map(([title, body]) => (
          <div key={title} className="mb-8">
            <h3 className="text-[13px] font-bold tracking-[0.15em] uppercase mb-3">
              {title}
            </h3>
            <p className="text-[15px] text-text-body leading-[1.8]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
