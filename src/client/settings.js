var instance = M.Tabs.init(document.getElementById('tabs'), {
  duration: 200,
  swipeable: false,
});

const elemId = 'settings_bank_accounts';

const setBankAccounts = (bankAccounts) => {
  console.log('success', bankAccounts);
  let elemStr = '';
  Object.entries(bankAccounts).forEach(([label, iban], index) => {
    const newLine = index === 0 ? '' : '\n';
    elemStr = elemStr + `${newLine}${label} = ${bankAccounts[label]}`;
  });
  const elem = document.getElementById(elemId);
  elem.value = elemStr;
  M.textareaAutoResize(elem);
};

const handleFailure = () => {
  console.log('failed');
  const elem = document.getElementById(elemId);
  elem.value = '';
};

const loadBankAccounts = () => {
  console.log('loading bank accounts');
  google.script.run
    .withSuccessHandler(setBankAccounts)
    .withFailureHandler(handleFailure)
    .getBankAccounts();
};

window.addEventListener('load', () => {
  loadBankAccounts();
});

////////////////////////////////////
/// AUTOMATIC CATEGORIZATION
////////////////////////////////////

// this function should retrieve the config in JSON format
const setAutomaticCategorizationConfig = (config) => {
  const elem = document.getElementById('settings_automatic_categorization');
  elem.value = JSON.stringify(config, null, 2);
  elem.disabled = false;
  M.textareaAutoResize(elem);
};

const validateConfig = () => {
  const inputElem = document.getElementById(
    'settings_automatic_categorization'
  );
  const statusElem = document.getElementById('validation-status');
  const button = document.getElementById('save-btn');
  try {
    if (JSON.parse(inputElem.value)) {
      statusElem.innerText = '✅';
      button.disabled = false;
      return;
    }
  } catch (ignore) {}

  statusElem.innerText = '❌';
  button.disabled = true;
};

const saveAutomaticCategorizationConfig = () => {
  const elem = document.getElementById('settings_automatic_categorization');
  try {
    const config = JSON.parse(elem.value);
    google.script.run
      .withSuccessHandler(() => alert('Configuration Saved!'))
      .withFailureHandler(() =>
        alert('Failed to store the config! Try again, is your JSON valid?')
      )
      .storeAutomaticCategorizationConfig(config);
  } catch (ignore) {
    alert('Failed to store the config! Try again, is your JSON valid?');
  }
};

const loadAutomaticCategorizationConfig = () => {
  console.log('loading config');
  google.script.run
    .withSuccessHandler(setAutomaticCategorizationConfig)
    .withFailureHandler(() => {
      alert('Failed to retrieve configuration');
      document.getElementById(
        'settings_automatic_categorization'
      ).disabled = false;
    })
    .getAutomaticCategorizationConfig();
};

window.addEventListener('load', loadAutomaticCategorizationConfig);
