import {useState, useEffect} from 'react';
import {PYODIDE_CONFIG} from './python-ide-config';

const PYODIDE_URL = `${PYODIDE_CONFIG.CDN}/${PYODIDE_CONFIG.VERSION}/full/pyodide.js`;
const PYODIDE_INDEX_URL = `${PYODIDE_CONFIG.CDN}/${PYODIDE_CONFIG.VERSION}/full/`;

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
                setIsLoading(true);
                await window.loadingPyodidePromise;
                setIsLoading(false);
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
