import LegalLayout from "@/components/gaylyfans/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — GaylyFans",
  description: "GaylyFans terms of service. Rules for using our gay adult video platform.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p><strong>Last updated:</strong> February 22, 2026</p>
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing GaylyFans, you agree to these Terms of Service. If you do not agree, you must leave the site immediately.</p>
      <h2>2. Age Requirement</h2>
      <p>You must be at least 18 years old (or the age of majority in your jurisdiction, whichever is higher) to access this site.</p>
      <h2>3. Content</h2>
      <p>GaylyFans hosts adult content intended for gay men. All content is curated and verified. We do not allow:</p>
      <ul>
        <li>Content involving minors in any capacity</li>
        <li>Non-consensual content</li>
        <li>Unauthorized third-party content</li>
        <li>Content that violates intellectual property rights</li>
        <li>Content depicting illegal activities</li>
        <li>Revenge porn</li>
      </ul>
      <h2>4. User Conduct</h2>
      <p>You agree not to download, redistribute, circumvent age verification, use automated tools, harass others, or misrepresent your identity.</p>
      <h2>5. DMCA / Takedown Requests</h2>
      <p>Contact us via our <a href="/contact" className="text-orange-400 hover:text-orange-300">Contact page</a> with a description, URL, contact info, and statement of good faith.</p>
      <h2>6. Disclaimer</h2>
      <p>GaylyFans is provided &ldquo;as is&rdquo; without warranties of any kind.</p>
    </LegalLayout>
  );
}
