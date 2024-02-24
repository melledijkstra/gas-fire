console.log('Hi from popup');

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse): undefined => {
    if (message.loggedIn !== undefined) {
      console.log('Logged in status: ', message.loggedIn);
      // You can perform further actions based on the login status
    }
  }
);

const sendMessage = (message: string) => {
  chrome.runtime.sendMessage(message);
};

document.addEventListener('DOMContentLoaded', () => {
  const btnFetch = document.getElementById('btnFetch');

  btnFetch?.addEventListener('click', () => {
    sendMessage('fetch');
  });
});
