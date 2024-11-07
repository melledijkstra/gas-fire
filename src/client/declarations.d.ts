declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare namespace google.script.host {
  const origin: string;
  function close(): void;
  function setHeight(height: number): void;
  function setWidth(height: number): void;
}

declare namespace google.script.host.editor {
  function focus(): void;
}
