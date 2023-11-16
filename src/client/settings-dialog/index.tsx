import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App';

import 'materialize-css/dist/css/materialize.min.css';
import './components/index.css';

const root = createRoot(document.getElementById('index'));
root.render(<App />);
