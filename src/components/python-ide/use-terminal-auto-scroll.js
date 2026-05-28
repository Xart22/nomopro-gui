import {useRef, useState, useEffect} from 'react';

const useTerminalAutoScroll = (terminalRef, activeBottomTab) => {
    const [isAutoScroll, setIsAutoScroll] = useState(true);
    const isAutoScrollRef = useRef(isAutoScroll);

    useEffect(() => {
        isAutoScrollRef.current = isAutoScroll;
    }, [isAutoScroll]);

    useEffect(() => {
        const container = terminalRef.current;
        if (!container) return;
        const pre = container.querySelector('pre');
        if (!pre) return;
        const scrollToBottom = () => {
            if (isAutoScrollRef.current && container) {
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        };
        const observer = new MutationObserver(scrollToBottom);
        observer.observe(pre, {
            childList: true,
            subtree: true,
            characterData: true
        });
        return () => observer.disconnect();
    }, [activeBottomTab]);

    useEffect(() => {
        if (isAutoScroll && terminalRef.current) {
            requestAnimationFrame(() => {
                terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
            });
        }
    }, [isAutoScroll]);

    return {isAutoScroll, setIsAutoScroll};
};

export default useTerminalAutoScroll;
