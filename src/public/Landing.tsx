import { PlayBuddy } from '../design/PlayArt';
import { WelcomeMark } from '../design/WelcomeMark';
import './public.css';

export function Landing() {
  return <div className="ashi-public shared-welcome">
    <a className="public-skip" href="#main">Skip to content</a>
    <header className="public-nav public-wrap"><a className="public-logo" href="/" aria-label="ASHI home"><WelcomeMark/></a><nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#for-you">Who it’s for</a><a href="/login">Sign in <span aria-hidden="true">↗</span></a></nav></header>
    <main id="main">
      <section className="public-hero public-wrap">
        <div className="public-hero-copy"><p className="public-eyebrow"><span/> A LITTLE TIME TO TRY</p><h1>Practice people skills.<br/><span>One game<br/>at a time.</span></h1><p className="public-lede">Short games to explore tone, meaning and other points of view.</p><div className="public-actions"><a className="public-button" href="/demo">Try the demo <span aria-hidden="true">→</span></a><a className="public-text-link" href="/demo?play=1">Take the quick tour <span aria-hidden="true">↗</span></a></div><p className="public-fine">75 seconds. No account needed.</p></div>
        <div className="public-hero-art" aria-label="Illustrative practice activity and adult observation">
          <div className="public-art-note">A SMALL MOMENT TO PRACTICE</div>
          <div className="public-sample"><span className="public-label">PEOPLE CLUES · SAMPLE</span><div className="public-buddy kid-zone"><PlayBuddy/></div><h2>What could<br/>you ask?</h2><p>A friend puts the game down.<br/>“Can we take a break?”</p><div className="public-sample-answer"><span>✓</span> “Want to stop or play later?”</div><span className="public-sample-foot">There’s room to ask.</span></div>
          <div className="public-parent-note"><span aria-hidden="true">↗</span><div><strong>Try it in everyday life.</strong><p>Notice what happens next.</p></div></div><span className="public-art-star" aria-hidden="true">✳</span>
        </div>
      </section>
      <section className="public-skill-strip" aria-label="Practice areas"><div className="public-wrap"><span>Tone & context</span><span aria-hidden="true">✳</span><span>Other points of view</span><span aria-hidden="true">✳</span><span>Implied meaning</span><span aria-hidden="true">✳</span><span>Asking for help</span></div></section>
      <section id="how-it-works" className="public-section public-wrap"><div className="public-section-head"><h2>Bring a moment.<br/>Make it practice.</h2><p>For kids working on social communication, including learners with IEPs.</p></div><div className="public-process">
        <article><span className="public-step-no">01 / NOTICE</span><div className="public-process-art"><span aria-hidden="true">“ ”</span><p>A confusing reply.<br/>A chance to ask.</p></div><h3>What happened?</h3><p>An adult captures a moment using roles, not real names.</p></article>
        <article><span className="public-step-no">02 / PRACTICE</span><div className="public-process-art public-process-art-gold"><span aria-hidden="true">↗</span><p>Find a clue.<br/>Try a response.</p></div><h3>Give it a go.</h3><p>Get help as needed. An adult reviews practice made from captured moments.</p></article>
        <article><span className="public-step-no">03 / CHECK IN</span><div className="public-process-art public-process-art-peach"><span aria-hidden="true">☀</span><p>Did it come up again?<br/>How did it go?</p></div><h3>See what carries over.</h3><p>Keep app progress and everyday observations side by side.</p></article>
      </div></section>
      <section id="for-you" className="public-audience"><div className="public-wrap"><div><h2>Kids play.<br/>Adults stay involved.</h2></div><div className="public-audience-grid"><article><span className="public-label">FOR FAMILIES</span><h3>Make it fit.</h3><p>Set the reading level. Choose plain wording. Bring in everyday moments.</p></article><article><span className="public-label">FOR SLPS</span><h3>Keep the context.</h3><p>Review practice and see what adults notice between sessions.</p></article></div></div></section>
      <section id="questions" className="public-section public-wrap public-faq"><div><h2>A few things<br/>to know.</h2></div><div>
        <details><summary>What’s in the demo?</summary><p>A fictional learner and five things to try. Nothing is saved to an account or sent to AI.</p></details>
        <details><summary>Is this therapy?</summary><p>No. ASHI is an early practice tool. It has not been clinically validated.</p></details>
        <details><summary>Who reviews the practice?</summary><p>The learner’s account owner reviews practice made from captured moments. Regular AI practice uses a separate flow. Separate parent and clinician accounts cannot share a learner yet.</p></details>
      </div></section>
      <section className="public-last public-wrap"><h2>Come have a look.</h2><a className="public-button" href="/demo">Explore the demo <span aria-hidden="true">→</span></a><p>Fictional examples. No signup.</p></section>
    </main>
    <footer className="public-wrap public-footer"><a className="public-logo" href="/" aria-label="ASHI home"><WelcomeMark/></a><p>Go at your own pace.</p><a href="/login">Account sign in ↗</a></footer>
  </div>;
}
