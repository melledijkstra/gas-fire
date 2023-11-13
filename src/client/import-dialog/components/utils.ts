const acceptedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];

export const isAllowedFile = (mimeType) => {
  if (!acceptedMimeTypes.includes(mimeType)) {
    alert(`Please upload a CSV file, "${mimeType}" is not accepted!`);
    return false;
  }
  return true;
};
