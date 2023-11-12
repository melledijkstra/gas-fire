import React, { useEffect, useRef, useState } from 'react';
import { serverFunctions } from '../../utils/serverFunctions';
import { StrategyOption, Table } from '../../../server/types';
import { isAllowedFile } from './utils';

export const App = () => {
  const fileRef = useRef<HTMLInputElement>();
  const [strategyOptions, setStrategyOptions] =
    useState<typeof StrategyOption>(null);
  // The strategy currently selected by the user
  const [selectedStrategy, setSelectedStrategy] =
    useState<StrategyOption>(null);
  const tabulatorRef = useRef<unknown>();

  const [statusText, setStatusText] = useState<string>('-');

  useEffect(() => {
    // UPDATE WITH CORRECT TYPES AND PACKAGES!
    // @ts-ignore
    M.FormSelect.init(document.querySelectorAll('select'));

    // @ts-ignore
    tabulatorRef.current = new Tabulator('#import-table', {
      autoColumns: true,
      // layout: "fitColumns",
      autoColumnsDefinitions: (definitions) => {
        definitions.forEach((definition) => (definition['headerSort'] = false));
        return definitions;
      },
    });

    serverFunctions
      .getStrategyOptions()
      .then((serverStrategyOptions) => {
        setStrategyOptions(serverStrategyOptions);
      })
      .catch(onFailure);
  }, []);

  const onSuccess = (response) => {
    if ('data' in response) setTableData(csvToJson(response.data));
    setStatusText(`Action successful! ${response.message}`);
    // @ts-ignore
    google.script.host.close();
  };

  const onFailure = (error) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: StrategyOption) => {
    serverFunctions
      .processCSV(data, importStrategy)
      .then(onSuccess)
      .catch(onFailure);
  };

  const getFile = () => {
    if (fileRef?.current?.files.length < 1) return;
    return fileRef.current.files[0];
  };

  const onParseError = (error) => {
    console.error(error);
    alert(`Parsing error: ${error}`);
  };

  function handleOnFileSelect() {
    const file = getFile();
    if (!file || !isAllowedFile(file.type)) return;
    triggerPreview();
  }

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const file = getFile();
    if (!file || !isAllowedFile(file.type)) return;
    // UPDATE WITH CORRECT TYPES / PACKAGE
    // @ts-ignore
    Papa.parse(file, {
      complete: (result) => submitDataToServer(result.data, selectedStrategy),
      error: onParseError,
    });
  };

  const triggerPreview = () => {
    const fileInput = getFile();

    if (!selectedStrategy || !fileInput) {
      setStatusText('File and strategy need to be set to generate preview!');
      return;
    }

    // UPDATE WITH CORRECT TYPES / PACKAGE
    // @ts-ignore
    tabulatorRef?.current?.clearData();
    setStatusText('Data is being processed...');
    // UPDATE WITH CORRECT TYPES / PACKAGE
    // @ts-ignore
    Papa.parse(fileInput, {
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
    setStatusText(`Your new balance: ${newBalance}`);
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
      // UPDATE WITH CORRECT TYPES / PACKAGE
      // @ts-ignore
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
                  ref={fileRef}
                  id="csvFiles"
                  type="file"
                  onChange={handleOnFileSelect}
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
        <div id="import-table"></div>
      </div>
    </>
  );
};
