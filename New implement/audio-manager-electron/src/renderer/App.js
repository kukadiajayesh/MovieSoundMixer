import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export default function App() {
    const [version, setVersion] = useState('');
    useEffect(() => {
        const getVersion = async () => {
            try {
                const v = await window.electron?.ipcRenderer?.invoke('get-version');
                setVersion(v);
            }
            catch (error) {
                console.error('Failed to get version:', error);
            }
        };
        getVersion();
    }, []);
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "FFmpeg Audio Manager" }), version && _jsxs("span", { className: "version", children: ["v", version] })] }), _jsx("main", { className: "app-main", children: _jsx("p", { children: "Welcome! This is your Electron + React application." }) })] }));
}
