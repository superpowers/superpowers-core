export default function fetch(url: string, type: string, callback: (err: Error, data?: any) => void) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.responseType = type;

  xhr.onload = (event) => {
    if (xhr.status !== 200 && xhr.status !== 0) {
      callback(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      return;
    }

    // Workaround for IE11
    let response = xhr.response;
    if (type === "json" && typeof xhr.response === "string") {
      console.log("SupClient: fetch: response was expected to be json, got a string instead. Now attempting to parse it as json...");
      try {
        response = JSON.parse(xhr.response);
      } catch (e) {
        console.log(e);
        console.log("SupClient: fetch: failed to parse response as json.");
      }
    }
    callback(null, response);
  };

  xhr.onerror = (event) => {
    console.log(event);
    callback(new Error(`Network error: ${(event.target as any).status}`));
  };

  xhr.send();
};
