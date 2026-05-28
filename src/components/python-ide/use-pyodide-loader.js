import {useState, useEffect} from 'react';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/';

const usePyodideLoader = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const preloadPyodide = async () => {
            if (window.pyodide) {
                setIsReady(true);
                return;
            }
            if (window.loadingPyodidePromise) {
                await window.loadingPyodidePromise;
                setIsReady(true);
                return;
            }
            setIsLoading(true);
            window.loadingPyodidePromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = PYODIDE_URL;
                script.crossOrigin = 'anonymous';
                script.onload = async () => {
                    try {
                        const pyodide = await window.loadPyodide({
                            indexURL: PYODIDE_INDEX_URL
                        });
                        window.pyodide = pyodide;
                        setIsLoading(false);
                        setIsReady(true);
                        resolve(pyodide);
                    } catch (err) {
                        setIsLoading(false);
                        reject(err);
                    }
                };
                script.onerror = err => {
                    setIsLoading(false);
                    reject(err || new Error('Failed to load pyodide script'));
                };
                document.head.appendChild(script);
            });
            return window.loadingPyodidePromise;
        };
        preloadPyodide().catch(err => {
            console.error('[PythonIDE] Failed to preload Pyodide:', err);
        });
    }, []);

    return {isLoading, isReady};
};

export default usePyodideLoader;
