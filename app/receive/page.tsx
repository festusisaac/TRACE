import { IntakeDesk } from "@/components/intake-desk";

export const metadata = { title: "Take a complaint · TRACE" };

export default function ReceivePage() {
  return (
    <>
      <header className="intro">
        <p className="eyebrow">Operations book / Intake</p>
        <h1>Take a complaint</h1>
        <p className="deck">
          One intake for branch, contact centre, email, social, the app, and USSD. The original message is kept. A missing payment reference does not drop the complaint.
        </p>
      </header>
      <IntakeDesk />
    </>
  );
}
