import LegalLayout from "@/components/gaylyfans/LegalLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Policy — GaylyFans",
  description: "GaylyFans content policy and creator guidelines.",
};

export default function ContentPolicyPage() {
  return (
    <LegalLayout title="Content Policy">
      <p><strong>Last updated:</strong> February 22, 2026</p>
      <h2>1. Allowed Content</h2>
      <p>Content from verified adult creators (18+), featuring consenting performers, compliant with all applicable laws.</p>
      <h2>2. Prohibited Content</h2>
      <ul>
        <li><strong>Minors:</strong> Any content involving individuals under 18</li>
        <li><strong>Non-consensual:</strong> Content depicting rape or coercion</li>
        <li><strong>Unauthorized content:</strong> Stolen or re-uploaded content</li>
        <li><strong>Revenge porn:</strong> Content shared without consent</li>
        <li><strong>Illegal acts:</strong> Bestiality, extreme violence</li>
        <li><strong>Deepfakes:</strong> AI content depicting real people without consent</li>
        <li><strong>Hate content:</strong> Content promoting hatred</li>
      </ul>
      <h2>3. Creator Verification</h2>
      <p>Government ID, selfie verification, consent agreements, and 2257 compliance required.</p>
      <h2>4. Reporting Violations</h2>
      <p>Report via our <a href="/contact" className="text-orange-400 hover:text-orange-300">Contact page</a>. We investigate all reports within 24 hours.</p>
    </LegalLayout>
  );
}
