import { HOME_FAQS } from "@/lib/seo"

export default function HomeFaqSection() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-8 pb-16 md:pb-20"
      aria-labelledby="home-faq-heading"
      data-testid="home-faq"
    >
      <h2 id="home-faq-heading" className="font-display text-2xl md:text-3xl text-navy mb-2">
        Frequently asked questions
      </h2>
      <p className="text-sm text-ink-muted mb-8 max-w-2xl">
        Clear answers about AmaraVisa services, our Gandhinagar office, and how applications work.
      </p>
      <dl className="space-y-4 max-w-3xl">
        {HOME_FAQS.map((faq) => (
          <div
            key={faq.question}
            className="rounded-2xl border border-border bg-white p-5 md:p-6 shadow-[var(--shadow-card)]"
          >
            <dt className="font-semibold text-navy text-base md:text-lg">{faq.question}</dt>
            <dd className="mt-2 text-sm md:text-[15px] text-ink-muted leading-relaxed">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
