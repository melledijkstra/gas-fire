const checkLoginStatus = () => {
  // Example: Check for a specific DOM element that indicates logged-in status
  const isLoggedIn = document.querySelector('.user-profile') !== null;
  return isLoggedIn;
};

chrome.runtime.sendMessage({ loggedIn: checkLoginStatus() });
