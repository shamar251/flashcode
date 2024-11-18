import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

const CodeEditor = ({
  code,
  onChange,
  readOnly = false,
  placeholder = "Write your code here..."
}) => {
  const handleChange = React.useCallback((value) => {
    onChange && onChange(value);
  }, [onChange]);

  return (
    <div className="code-editor">
      <CodeMirror
        value={code}
        height="200px"
        theme="dark"
        extensions={[javascript()]}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          history: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          defaultKeymap: true,
          searchKeymap: true,
          historyKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true
        }}
      />
    </div>
  );
};

export default CodeEditor;
