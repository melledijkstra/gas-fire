import { createRoot } from 'react-dom/client';
import { Dialog } from './Dialog';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<Dialog />);
}
