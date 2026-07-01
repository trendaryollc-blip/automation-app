import { Link } from "wouter";

/**
 * Terms of Service.
 *
 * This is a generic SaaS Terms template.  Before going live, you
 * MUST have it reviewed by a lawyer licensed in the jurisdiction you
 * operate in.  Update the "Effective date" and the company name /
 * address / contact email before publishing.
 */
export default function Terms() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto rounded-lg border border-border bg-card p-8">
        <Link href="/login" className="text-sm text-primary hover:underline">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Effective date: 2026-01-01
        </p>

        <Section title="1. Acceptance of terms">
          By creating an account or otherwise using DropFlow ("the Service"),
          you agree to be bound by these Terms. If you do not agree, do not use
          the Service.
        </Section>

        <Section title="2. Accounts">
          You are responsible for maintaining the confidentiality of your
          account credentials and for all activity that occurs under your
          account. Notify us immediately of any unauthorized use.
        </Section>

        <Section title="3. Acceptable use">
          You agree not to (a) use the Service to violate any law, (b) upload
          malicious content, (c) attempt to disrupt the Service, or (d)
          reverse-engineer the Service except as permitted by law.
        </Section>

        <Section title="4. Fees and billing">
          Paid features are billed in advance on a recurring basis. Fees are
          non-refundable except where required by law. We may change prices with
          30 days' notice.
        </Section>

        <Section title="5. Termination">
          We may suspend or terminate your access if you breach these Terms. You
          may stop using the Service at any time. Sections that by their nature
          should survive termination will do so.
        </Section>

        <Section title="6. Disclaimer">
          The Service is provided "as is" without warranties of any kind,
          express or implied, including but not limited to merchantability or
          fitness for a particular purpose.
        </Section>

        <Section title="7. Limitation of liability">
          To the maximum extent permitted by law, DropFlow shall not be liable
          for any indirect, incidental, special, or consequential damages.
        </Section>

        <Section title="8. Changes">
          We may update these Terms from time to time. We will notify you of
          material changes via email or in-app banner. Continued use after the
          effective date constitutes acceptance.
        </Section>

        <Section title="9. Contact">
          Questions? Contact us at legal@dropflow.com.
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground leading-6">{children}</p>
    </section>
  );
}
