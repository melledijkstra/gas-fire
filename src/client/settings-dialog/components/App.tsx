import React, { useEffect, useRef } from 'react';
import M from 'materialize-css';
import { AutomaticCategorizationForm } from './AutomaticCategorizationForm';
import { ImportRulesForm } from './ImportRulesForm';

export const App = () => {
  const tabsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    M.Tabs.init(tabsRef.current, {
      duration: 200,
      swipeable: false,
    });
  }, []);

  return (
    <div className="row">
      <div className="col s12">
        <ul ref={tabsRef} className="tabs">
          <li className="tab col s3">
            <a className="green-text text-darken-3" href="#import_rules">
              Import Rules
            </a>
          </li>
          <li className="tab col s3">
            <a
              className="green-text text-darken-3"
              href="#automatic_categorization"
            >
              Automatic Categorization
            </a>
          </li>
        </ul>
      </div>
      <div id="import_rules" className="col s12">
        <ImportRulesForm />
      </div>
      <div id="automatic_categorization" className="col s12">
        <AutomaticCategorizationForm />
      </div>
    </div>
  );
};
