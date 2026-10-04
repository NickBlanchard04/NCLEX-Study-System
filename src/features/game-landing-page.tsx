import { Link } from 'react-router-dom'
import { Breadcrumbs } from '../seo/RouteSeo'
import { StudyToolsMenu } from './study-tools-menu'
import logo from '../assets/brand/nursing-command-logo-small.webp'

export function GameLandingPage() {
  return <div className="topic-page game-landing">
    <header className="home-launcher-header"><Link className="home-launcher-brand" to="/"><img src={logo} alt="" /><span>Nurse <span>Command</span></span></Link><StudyToolsMenu /></header>
    <main className="topic-content">
      <Breadcrumbs />
      <h1>Nurse Command Tycoon</h1>
      <p className="topic-intro">A browser-based hospital management game. Take the nursing role, respond to patient calls, and build up your ward one shift at a time.</p>
      <Link className="topic-start" to="/nurse-tycoon/">Play Nurse Tycoon →</Link>
      <p className="topic-source">Open beta · Play in your browser</p>
      <figure className="game-landing-preview"><img src="/nurse-tycoon-gameplay.png" width="1440" height="900" alt="Nurse Command Tycoon gameplay showing an isometric hospital ward, patient rooms, nursing station, and shift controls." fetchPriority="high" /><figcaption>Inside the ward: patient rooms, nursing station, and shift priorities. Game visuals may change during beta.</figcaption></figure>
      <section><h2>What happens during a shift?</h2>
        <ol className="game-landing-steps">
          <li><strong>Make your rounds.</strong> Move through the ward, assess fictional patients, and review the next care step.</li>
          <li><strong>Respond to changes.</strong> Handle call bells, choose a response, and reassess before charting at the nursing station.</li>
          <li><strong>Review and upgrade.</strong> Finish the shift, look back at your decisions, and spend in-game earnings on ward upgrades.</li>
        </ol>
        <p>Start in Fundamentals Clinic. Work toward discharging three patients with a safety score of at least 80% within 24 game minutes. Successful shifts unlock more options, including extra rooms and support staff.</p>
      </section>
      <section><h2>How to play</h2><div className="game-landing-controls">
        <div><h3>On a computer</h3><p>Use WASD or the arrow keys to move, or click the floor to walk. Use the interaction controls at patients and equipment. Open the shop to explore upgrades.</p></div>
        <div><h3>On a phone</h3><p>Use the on-screen movement and interaction controls. Landscape gives you more room to see the hospital. Pause when you need a break.</p></div>
      </div></section>
      <section><h2>A nursing game, not a clinical protocol</h2><p>This nursing simulation game uses fictional cases and scripted responses. It is not clinically validated training, medical advice, an official NCLEX product, or a substitute for supervised clinical education.</p><p>Looking for exam questions instead? <Link to="/exam-prep/">Explore NCLEX exam prep</Link> or <Link to="/practice-questions/">try practice questions</Link>.</p></section>
      <section><h2>Ready for your next shift?</h2><Link className="topic-start" to="/nurse-tycoon/">Play Nurse Tycoon →</Link></section>
    </main>
    <footer className="topic-footer"><Link to="/about/">About Nurse Command</Link><Link to="/privacy/">Privacy</Link><Link to="/terms/">Terms</Link></footer>
  </div>
}
