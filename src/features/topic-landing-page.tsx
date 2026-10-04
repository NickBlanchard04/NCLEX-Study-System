import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import topics from '../seo/topics.json'
import { nclexCategoryExpansion } from '../data/nclex-category-expansion'
import { trackAppEvent } from '../services/analytics-client'
import { Breadcrumbs } from '../seo/RouteSeo'
import logo from '../assets/brand/nursing-command-logo-small.webp'
import { TopicLinks } from './topic-links'

export function TopicLandingPage({ slug }: { slug: string }) {
  const topic = topics.find(item => item.slug === slug)!
  const question = nclexCategoryExpansion.find(item => item.id === topic.sampleId)!
  const path = `/nclex-rn/${slug}/`
  const practiceUrl = `/exam-prep?topic=${slug}&preview=5`
  useEffect(() => { void trackAppEvent('page_view', { page_path: path, feature_name: 'Topic guide', question_category: topic.category }) }, [path, topic.category])
  return <div className="topic-page">
    <header className="home-launcher-header"><Link className="home-launcher-brand" to="/"><img src={logo} alt="" /><span>Nurse <span>Command</span></span></Link><Link className="home-tools-trigger" to="/exam-prep">Exam Prep</Link></header>
    <main className="topic-content">
      <Breadcrumbs />
      <h1>{topic.title}</h1>
      <p className="topic-intro">{topic.intro}</p>
      <Link className="quick-session-primary topic-start" to={practiceUrl} onClick={() => void trackAppEvent('external_cta_clicked', { page_path: path, feature_name: 'Topic practice CTA', question_category: topic.category, metadata: { destination: practiceUrl } })}>Practice this topic →</Link>
      <p>Start with up to 5 questions. No account needed.</p>
      <section><h2>What you’ll practice</h2><ul>{topic.focus.map(item => <li key={item}>{item}</li>)}</ul><p>{topic.approach}</p></section>
      <section aria-labelledby="sample-title"><h2 id="sample-title">Try a sample question</h2><p>{question.scenario}</p><h3>{question.prompt}</h3>
        <ol className="topic-answers" type="A">{question.choices.map(choice => <li key={choice.id}>{choice.text}</li>)}</ol>
        <details className="topic-rationale"><summary>Show answer and explanation</summary>
          <p><strong>Answer: {question.correctAnswer.join(', ')}.</strong> {question.choices.filter(choice => question.correctAnswer.includes(choice.id)).map(choice => choice.text).join(' ')}</p>
          <p>{question.rationale.whyCorrect}</p><h3>Why the other options don’t fit</h3><p>{question.rationale.whyOthers}</p>
        </details>
        <p className="topic-source">Reference: <a href={question.sourceRefs![0]} target="_blank" rel="noreferrer">{topic.sourceLabel}</a></p>
        <p className="topic-source">Nurse Command practice content · Not yet independently clinically reviewed. Educational study support, not clinical guidance or an official NCLEX item.</p>
      </section>
      <section><h2>Make the next session count</h2><p>Try the topic review, read the explanations, and revisit the questions you missed. At the end, you can create an account to save your results.</p><Link className="quick-session-primary topic-start" to={practiceUrl}>Start a 5-question review →</Link></section>
      <TopicLinks />
    </main>
    <footer className="topic-footer"><Link to="/about/">About Nurse Command</Link><Link to="/privacy/">Privacy</Link><Link to="/terms/">Terms</Link></footer>
  </div>
}
