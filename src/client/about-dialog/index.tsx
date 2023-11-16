import React from 'react';
import { createRoot } from 'react-dom/client';
import { About } from './components/About';

// import css from external packages
import 'materialize-css/dist/css/materialize.min.css';

const root = createRoot(document.getElementById('index'));
root.render(<About />);
