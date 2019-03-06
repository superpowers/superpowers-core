export default function readFile(file: File, type: string, callback: (err: Error, data?: any) => void) {
  const reader = new FileReader;

  reader.onload = (event) => {
    let data: any;

    if (type === "json") {
      try { data = JSON.parse((event.target as FileReader).result as string); }
      catch (err) { callback(err, null); return; }
    } else{
      data = (event.target as FileReader).result;
    }

    callback(null, data);
  };

  switch (type) {
    case "text":
    case "json":
      reader.readAsText(file);
      break;

    case "arraybuffer":
      reader.readAsArrayBuffer(file);
      break;

    default:
      callback(new Error(`Unsupported readFile type: ${type}`));
  }
}
