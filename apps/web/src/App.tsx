import { useEffect, useState } from 'react';
import { Editor } from './components/Editor.tsx';

/** Two routes, no router dependency: "/" is a fresh editor, "/<slug>" is a saved project. */
function currentSlug(): string | null {
  const s = location.pathname.replace(/^\/+|\/+$/g, '');
  return s === '' ? null : s;
}

export function App() {
  const [slug, setSlug] = useState(currentSlug);
  useEffect(() => {
    const onPop = () => setSlug(currentSlug());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);
  const navigate = (next: string) => {
    history.pushState(null, '', `/${next}`);
    setSlug(next);
  };
  return <Editor key={slug ?? 'new'} slug={slug} onNavigate={navigate} />;
}
