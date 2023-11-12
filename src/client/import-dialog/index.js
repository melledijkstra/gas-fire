const acceptedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];

const preventFormSubmit = () => {
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (e) => e.preventDefault());
  });
};
window.addEventListener('load', preventFormSubmit);
document.addEventListener('DOMContentLoaded', () => {
  M.FormSelect.init(document.querySelectorAll('select'));
});

const onSuccess = (response) => {
  if ('data' in response) setTableData(csvToJson(response.data));
  document.getElementById(
    'status'
  ).innerHTML = `Action successful! ${response.message}`;
  google.script.host.close();
};

const onFailure = (error) => alert(`Action failed! ${error}`);

const submitDataToServer = (data, importStrategy) => {
  google.script.run
    .withSuccessHandler(onSuccess)
    .withFailureHandler(onFailure)
    .processCSV(data, importStrategy);
};

const getFile = () => {
  const fileElement = document.getElementById('csvFiles');
  if (fileElement.files.length < 1) return;
  return fileElement.files[0];
};

const getStrategy = () => {
  return document.getElementById('import-strategy')?.value;
};

const onParseError = (error) => {
  console.error(error);
  alert(`Parsing error: ${error}`);
};

const isAllowedFile = (mimeType) => {
  if (!acceptedMimeTypes.includes(mimeType)) {
    alert(`Please upload a CSV file, "${mimeType}" is not accepted!`);
    return false;
  }
  return true;
};

const setStatusText = (text) => {
  document.getElementById('statusText').innerText = text;
};

function handleOnFileSelect() {
  const file = getFile();
  if (!file || !isAllowedFile(file.type)) return;
  triggerPreview();
}

function handleFormSubmit() {
  const file = getFile();
  if (!file || !isAllowedFile(file.type)) return;
  const importStrategy = document.getElementById('import-strategy')?.value;
  Papa.parse(file, {
    complete: (result) => submitDataToServer(result.data, importStrategy),
    error: onParseError,
  });
}

let tabulator;

const renderStrategyOptions = (strategies) => {
  const elemSelect = document.getElementById('import-strategy');
  for (const strategy in strategies) {
    elemSelect.add(new Option(strategy, strategies[strategy]));
  }
};

const handleOnStrategySelect = () => {
  triggerPreview();
};

const triggerPreview = () => {
  const strategy = getStrategy();
  const fileInput = getFile();

  if (!strategy || !fileInput) {
    setStatusText('File and strategy need to be set to generate preview!');
    return;
  }

  tabulator.clearData();
  setStatusText('Data is being processed...');

  Papa.parse(fileInput, {
    complete: (result) => generatePreview(result.data, strategy),
    error: onParseError,
  });
};

const onLoad = () => {
  google.script.run
    .withSuccessHandler(renderStrategyOptions)
    .withFailureHandler(onFailure)
    .getStrategyOptions();

  tabulator = new Tabulator('#import-table', {
    autoColumns: true,
    // layout: "fitColumns",
    autoColumnsDefinitions: (definitions) => {
      definitions.forEach((definition) => (definition['headerSort'] = false));
      return definitions;
    },
  });
};

const generatePreview = (data, strategy) => {
  google.script.run
    .withSuccessHandler(onGeneratePreviewSuccess)
    .withFailureHandler(onFailure)
    .generatePreview(data, strategy);
};

const onGeneratePreviewSuccess = ({ result, newBalance }) => {
  console.log('received from server', { result, newBalance });
  setStatusText(`Your new balance: ${newBalance}`);

  setPreview(result);
};

const csvToJson = (csvData) => {
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
    tabulator.setData(data);
  } catch (error) {
    alert(`Could not set table data (error: ${error})`);
  }
};

const setPreview = (data) => {
  setTableData(csvToJson(data));
};

window.addEventListener('load', onLoad);
