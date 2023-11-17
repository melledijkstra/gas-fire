import { createRoot } from 'react-dom/client';
import { About } from './components/About';

// import css from external packages
import 'materialize-css/dist/css/materialize.min.css';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<About />);
}
