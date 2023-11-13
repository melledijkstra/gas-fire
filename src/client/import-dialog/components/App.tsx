import React, { useEffect, useRef, useState } from 'react';
import { serverFunctions } from '../../utils/serverFunctions';
import { StrategyOption, Table } from '../../../server/types';
import { isAllowedFile } from './utils';
import M from 'materialize-css';
import Tabulator from 'tabulator-tables';
import Papa from 'papaparse';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'materialize-css/dist/css/materialize.min.css';

export const App = () => {
  const [strategyOptions, setStrategyOptions] =
    useState<typeof StrategyOption>(null);
  // The strategy currently selected by the user
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyOption>(null);
  const [statusText, setStatusText] = useState<string>('-');

  const tabulatorRef = useRef<Tabulator>();
  const tabulatorContainer = useRef<HTMLDivElement>(null);

  const [importFile, setImportFile] = useState<File>(null);

  // This useEffect is here to initialize some parts of the webpage
  useEffect(() => {
    M.FormSelect.init(document.querySelectorAll('select'));

    serverFunctions
      .getStrategyOptions()
      .then((serverStrategyOptions) => {
        setStrategyOptions(serverStrategyOptions);
      })
      .catch(onFailure);
  }, []);

  useEffect(() => {
    tabulatorRef.current = new Tabulator(tabulatorContainer.current, {
      autoColumns: true,
      layout: 'fitColumns',
      autoColumnsDefinitions: (definitions) => {
        definitions.forEach((definition) => (definition['headerSort'] = false));
        return definitions;
      },
    });
  }, [tabulatorContainer.current]);

  const onSuccess = (response) => {
    if ('data' in response) setTableData(csvToJson(response.data));
    setStatusText(`Action successful! ${response.message}`);
    google.script.host.close();
  };

  const onFailure = (error) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: StrategyOption) => {
    serverFunctions
      .processCSV(data, importStrategy)
      .then(onSuccess)
      .catch(onFailure);
  };

  const onParseError = (error) => {
    console.error(error);
    alert(`Parsing error: ${error}`);
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!importFile || !isAllowedFile(importFile.type)) return;
    Papa.parse<string[]>(importFile, {
      complete: (result) => submitDataToServer(result.data, selectedStrategy),
      error: onParseError,
    });
  };

  const triggerPreview = () => {
    if (!selectedStrategy || !importFile) {
      setStatusText('File and strategy need to be set to generate preview!');
      return;
    }

    tabulatorRef?.current?.clearData();
    setStatusText('Data is being processed...');
    Papa.parse<string[]>(importFile, {
      complete: (result) => generatePreview(result.data, selectedStrategy),
      error: onParseError,
    });
  };

  const generatePreview = (data: Table, strategy: StrategyOption) => {
    serverFunctions
      .generatePreview(data, strategy)
      .then(onGeneratePreviewSuccess)
      .catch(onFailure);
  };

  const onGeneratePreviewSuccess = ({ result, newBalance }) => {
    console.log('received from server', { result, newBalance });
    // setStatusText(`Your new balance: ${newBalance}`);
    setStatusText('Import preview set');
    setPreview(result);
  };

  const csvToJson = (csvData: Table): {}[] => {
    const headers = csvData.shift();
    return csvData.map((row) => {
      let jsonRow = {};
      row.forEach((value, index) => {
        jsonRow[headers[index]] = value;
      });
      return jsonRow;
    });
  };

  const setTableData = (data) => {
    try {
      tabulatorRef.current.setData(data);
    } catch (error) {
      alert(`Could not set table data (error: ${error})`);
    }
  };

  const setPreview = (data: Table) => {
    setTableData(csvToJson(data));
  };

  console.log({ strategyOptions, selectedStrategy });

  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <div className="row">
          <div className="col s6">
            <div className="file-field input-field">
              <div className="btn green darken-3">
                <span>Select File</span>
                <input
                  required
                  id="csvFiles"
                  type="file"
                  onChange={(event) => {
                    setImportFile(event.target.files[0]);
                    triggerPreview();
                  }}
                  accept="text/csv"
                  name="csvFiles"
                />
              </div>
              <div className="file-path-wrapper">
                <input className="file-path validate" type="text" />
              </div>
            </div>
          </div>

          <div className="col s6">
            <label>Select Bank</label>
            <select
              required
              id="import-strategy"
              onChange={(event) => {
                setSelectedStrategy(event.target.value as StrategyOption);
                triggerPreview();
              }}
              className="browser-default"
            >
              <option value="" disabled selected>
                Choose Bank
              </option>
              {strategyOptions
                ? Object.keys(strategyOptions).map((key) => (
                    <option key={key} value={StrategyOption[key]}>
                      {key}
                    </option>
                  ))
                : null}
            </select>
          </div>
        </div>

        <div className="row">
          <div className="col s12">
            <div className="right-align">
              <button className="btn green darken-3" type="submit">
                IMPORT
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="left-align">
            <p id="statusText">{statusText}</p>
          </div>
        </div>
      </form>

      <div className="row">
        <h5>Preview data</h5>
        <div ref={tabulatorContainer}></div>
      </div>
    </>
  );
};
