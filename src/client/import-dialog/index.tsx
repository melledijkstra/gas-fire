import { createRoot } from 'react-dom/client';
import { Dialog } from './Dialog';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<Dialog />);
}
