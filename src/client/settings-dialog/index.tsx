import { createRoot } from 'react-dom/client';
import { App } from './components/App';

import 'materialize-css/dist/css/materialize.min.css';
import './components/index.css';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
