import { Link } from 'react-router-dom'
import topics from '../seo/topics.json'

export function TopicLinks() {
  return <nav className="topic-directory" aria-label="NCLEX practice by topic">
    <h2>Explore practice by topic</h2>
    <ul>{topics.map(topic => <li key={topic.slug}><Link to={`/nclex-rn/${topic.slug}/`}>{topic.category}</Link></li>)}</ul>
  </nav>
}
