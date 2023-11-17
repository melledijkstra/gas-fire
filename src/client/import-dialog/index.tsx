import { createRoot } from 'react-dom/client';
import { App } from './components/App';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'materialize-css/dist/css/materialize.min.css';

const container = document.getElementById('index');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
