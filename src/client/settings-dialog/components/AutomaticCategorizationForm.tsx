import React from 'react';

export const AutomaticCategorizationForm = () => {
  return (
    <>
      <div>
        <label htmlFor="settings_automatic_categorization">
          Automatic Categorization Config
        </label>
        <textarea disabled id="settings_automatic_categorization">
          Loading...
        </textarea>
      </div>
      <button id="save-btn" disabled>
        Store configuration
      </button>
    </>
  );
};
