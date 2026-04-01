import type { ServerResponse } from "@/common/types";

function isServerResponse(value: unknown): value is ServerResponse {
  return !!value && typeof value === 'object' && 'success' in value;
}

export const onFailure = (error: ServerResponse | Error | string) => {
  console.log(error);

  if (isServerResponse(error) && error.success) {
    // In case of a successful response, we don't want to show an error message
    return;
  }

  let errorMsg: string;

  if (typeof error === 'string') {
    errorMsg = error;
  } else if (error instanceof Error) {
    errorMsg = error.message;
  } else {
    errorMsg = error.error;
  }

  alert(`Action failed! ${errorMsg}`);
};