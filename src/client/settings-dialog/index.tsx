import { createRoot } from 'react-dom/client';
import { App } from './components/App';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
