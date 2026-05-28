import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import styles from './python-ide.css';

const BTNS = {
    search: {
        icon: (
            <>
                <circle
                    cx="11"
                    cy="11"
                    r="8"
                />
                <line
                    x1="21"
                    y1="21"
                    x2="16.65"
                    y2="16.65"
                />
            </>
        )
    },
    copy: {
        icon: (
            <>
                <rect
                    x="9"
                    y="9"
                    width="13"
                    height="13"
                    rx="2"
                />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </>
        )
    },
    autoScroll: {
        iconOn: <polyline points="20 6 9 17 4 12" />,
        iconOff: <path d="M18 6L6 18M6 6l12 12" />
    },
    scrollBottom: {
        icon: <path d="M5 9l7-7 7 7M5 15l7 7 7-7" />
    },
    delete: {
        icon: (
            <>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </>
        )
    }
};

const FloatingToolbar = ({
    isAutoScroll,
    onToggleAutoScroll,
    onSearch,
    onCopy,
    onScrollBottom,
    onClear
}) => (
    <Box
        style={{
            position: 'absolute',
            bottom: 150,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            zIndex: 10,
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 6,
            padding: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            willChange: 'transform'
        }}
    >
        <button
            onClick={onSearch}
            title="Search"
            className={styles.terminalActionBtn}
            type="button"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                {BTNS.search.icon}
            </svg>
        </button>
        <button
            onClick={onCopy}
            title="Copy"
            className={styles.terminalActionBtn}
            type="button"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                {BTNS.copy.icon}
            </svg>
        </button>
        <button
            onClick={onToggleAutoScroll}
            title={isAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
            className={styles.terminalActionBtn}
            type="button"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                {isAutoScroll ?
                    BTNS.autoScroll.iconOn :
                    BTNS.autoScroll.iconOff}
            </svg>
        </button>
        <button
            onClick={onScrollBottom}
            title="Scroll to bottom"
            className={styles.terminalActionBtn}
            type="button"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                {BTNS.scrollBottom.icon}
            </svg>
        </button>
        <button
            onClick={onClear}
            title="Delete"
            className={styles.terminalActionBtn}
            type="button"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                {BTNS.delete.icon}
            </svg>
        </button>
    </Box>
);

FloatingToolbar.propTypes = {
    isAutoScroll: PropTypes.bool,
    onToggleAutoScroll: PropTypes.func,
    onSearch: PropTypes.func,
    onCopy: PropTypes.func,
    onScrollBottom: PropTypes.func,
    onClear: PropTypes.func
};

export default FloatingToolbar;
