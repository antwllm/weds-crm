import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function CodeMirrorEditor({ value, onChange, height = '300px' }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={[html()]}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: false }}
    />
  );
}
