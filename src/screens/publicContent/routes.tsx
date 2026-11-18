import { useParams } from 'react-router-dom';
import { TopicPageView } from './TopicPageView';
import { RolePlayExampleView } from './RolePlayExampleView';

// The two parameterised routes for the public SEO content. They only read the
// URL: the pages themselves (TopicPageView, RolePlayExampleView) take a slug,
// so the build-time prerender can render them without a router.

export function TopicRoute() {
  const { slug = '' } = useParams();
  return <TopicPageView slug={slug} />;
}

export function RolePlayRoute() {
  const { slug = '' } = useParams();
  return <RolePlayExampleView slug={slug} />;
}
