import React, { useEffect, useRef } from "react";
import Monaco from "@monaco-editor/react";

const CodeEditor = ({ code, setCode, language, theme, fontSize, fontFamily }) => {
    const monacoRef = useRef(null);

    const handleEditorDidMount = (_, monaco) => {
        monacoRef.current = monaco;
        const monacoTheme = theme.replace("theme-", "");
        monaco.editor.setTheme(monacoTheme);
    };

    useEffect(() => {
        if (monacoRef.current) {
            const monacoTheme = theme.replace("theme-", "");
            monacoRef.current.editor.setTheme(monacoTheme);
        }
    }, [theme]);

    return (
        <Monaco
            height="80vh"
            language={language}
            theme={theme} // Should be a valid Monaco theme like "vs-dark"
            value={code}
            options={{
                fontSize,
                fontFamily,
                automaticLayout: true,
            }}
            onChange={(value) => setCode(value || "")}
            onMount={handleEditorDidMount}
        />
    );
};

export default CodeEditor;
