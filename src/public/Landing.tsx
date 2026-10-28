import { PlayBuddy } from '../design/PlayArt';
import './public.css';

export function Landing() {
  return <div className="ashi-public">
    <a className="public-skip" href="#main">Skip to content</a>
    <header className="public-nav public-wrap"><a className="public-logo" href="/" aria-label="ASHI home">✳ ashi<span>.</span></a><nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#for-you">Who it’s for</a><a href="/login">Sign in <span aria-hidden="true">↗</span></a></nav></header>
    <main id="main">
      <section className="public-hero public-wrap">
        <div className="public-hero-copy"><p className="public-eyebrow"><span/> A LITTLE PRACTICE. A LITTLE POSSIBILITY.</p><h1>Little moments.<br/>More ways<br/>to <em>connect.</em></h1><p className="public-lede">Understanding people takes practice. Make room for it with small, supported activities—and a bridge to everyday life.</p><div className="public-actions"><a className="public-button" href="/demo">Try the demo <span aria-hidden="true">→</span></a><a className="public-text-link" href="/demo?play=1">Play the 75-second tour <span aria-hidden="true">↗</span></a></div><p className="public-fine">Fictional learner. No account needed. Explore at your own pace.</p></div>
        <div className="public-hero-art" aria-label="Illustrative practice activity and parent observation">
          <div className="public-art-note">SMALL STORIES. EVERYDAY SKILLS.</div>
          <div className="public-sample"><span className="public-label">PEOPLE CLUES · SAMPLE ACTIVITY</span><div className="public-buddy kid-zone"><PlayBuddy/></div><h2>What could<br/>you ask?</h2><p>A friend puts the game down.<br/>“Can we take a break?”</p><div className="public-sample-answer"><span>✓</span> “Would you like to stop or play later?”</div><span className="public-sample-foot">Notice a clue. Try a response.</span></div>
          <div className="public-parent-note"><span aria-hidden="true">↗</span><div><strong>Beyond the screen</strong><p>Notice what happens in everyday moments.</p></div></div>
          <span className="public-art-star" aria-hidden="true">✳</span>
        </div>
      </section>
      <section className="public-skill-strip" aria-label="Practice areas"><div className="public-wrap"><span>Tone & context</span><span aria-hidden="true">✳</span><span>Other points of view</span><span aria-hidden="true">✳</span><span>Implied meaning</span><span aria-hidden="true">✳</span><span>Asking for help</span></div></section>
      <section id="how-it-works" className="public-section public-wrap"><div className="public-section-head"><p className="public-eyebrow">A LOOP, NOT JUST A LESSON</p><h2>From “what happened?”<br/>to “let’s try it.”</h2><p>ASHI is being built for kids with pragmatic-language goals, including learners with IEPs. Adults help keep practice relevant.</p></div><div className="public-process">
        <article><span className="public-step-no">01 / NOTICE</span><div className="public-process-art"><span aria-hidden="true">“ ”</span><p>A group activity.<br/>A confusing reply.<br/>A moment to revisit.</p></div><h3>Start with everyday life.</h3><p>An adult captures a role-based summary of a social moment. Real names and freeform moment notes aren’t saved.</p></article>
        <article><span className="public-step-no">02 / PRACTICE</span><div className="public-process-art public-process-art-gold"><span aria-hidden="true">↗</span><p>Find a clue.<br/>Consider a possibility.<br/>Try a response.</p></div><h3>Make space to try.</h3><p>Four support levels offer different amounts of help. Moment-based practice waits for the account owner’s review.</p></article>
        <article><span className="public-step-no">03 / CHECK IN</span><div className="public-process-art public-process-art-peach"><span aria-hidden="true">☀</span><p>Did it come up again?<br/>What help was useful?<br/>How did it go?</p></div><h3>Look beyond a score.</h3><p>Compare app history with adult observations. No opportunity to use a skill is recorded separately from success or difficulty.</p></article>
      </div></section>
      <section id="for-you" className="public-audience"><div className="public-wrap"><div><p className="public-eyebrow">DIFFERENT ROLES. A SHARED PURPOSE.</p><h2>More room for kids.<br/>More context for adults.</h2></div><div className="public-audience-grid"><article><span className="public-label">FOR FAMILIES</span><h3>Keep it manageable.</h3><p>Adjust reading demands, choose plain wording and bring everyday moments into practice.</p></article><article><span className="public-label">FOR SLPS</span><h3>See the whole picture.</h3><p>Review moment-based activities and look at the help used alongside caregiver observations.</p></article></div></div></section>
      <section id="questions" className="public-section public-wrap public-faq"><div><p className="public-eyebrow">A FEW GOOD QUESTIONS</p><h2>Before you explore.</h2></div><div>
        <details><summary>What will I see in the demo?</summary><p>A guided, interactive tour of practice, moment capture, review, weekly check-ins and learning preferences. All examples and results are fictional; generation and saving are simulated.</p></details>
        <details><summary>Does ASHI replace a speech-language pathologist?</summary><p>No. ASHI is an early practice tool, not an assessment or a replacement for therapy. Its effectiveness has not been established by a clinical study.</p></details>
        <details><summary>Is grade the same as a skill level?</summary><p>No. School grade shapes context, reading grade shapes wording, and adaptive support controls the help offered. Skill tiers are separate, experimental progress indicators.</p></details>
        <details><summary>How does adult review work?</summary><p>The child’s account owner reviews Carryover items before they enter practice. Shared access between a separate parent account and clinician account is not available yet. Ordinary AI-generated practice has a different generation flow.</p></details>
      </div></section>
      <section className="public-last public-wrap"><span className="public-eyebrow">SEE IT FOR YOURSELF</span><h2>One small story.<br/>A good place to start.</h2><a className="public-button" href="/demo">Explore the demo <span aria-hidden="true">→</span></a><p>Early product · Adult feedback welcome · Fictional examples only</p></section>
    </main>
    <footer className="public-wrap public-footer"><a className="public-logo" href="/">ashi.</a><p>Practice for the little moments.</p><a href="/login">Account sign in ↗</a></footer>
  </div>;
}
