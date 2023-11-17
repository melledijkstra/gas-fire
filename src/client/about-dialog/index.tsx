import { createRoot } from 'react-dom/client';
import { About } from './components/About';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<About />);
}
