import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import styles from './python-ide.css';

const ContextMenu = ({x, y, items, onClose}) => (
    <>
        <Box
            className={styles.contextMenuOverlay}
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
            }}
        />
        <Box
            className={styles.contextMenu}
            style={{
                position: 'fixed',
                left: `${x}px`,
                top: `${y}px`,
                zIndex: 1000
            }}
            onContextMenu={e => e.preventDefault()}
        >
            {items.map((item, idx) =>
                (item.type === 'separator' ? (
                    <hr
                        key={`sep-${idx}`}
                        className={styles.contextMenuDivider}
                    />
                ) : (
                    <button
                        key={idx}
                        className={styles.contextMenuItem}
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        type="button"
                        disabled={item.disabled}
                    >
                        {item.label}
                    </button>
                )),
            )}
        </Box>
    </>
);

ContextMenu.propTypes = {
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    items: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            onClick: PropTypes.func,
            type: PropTypes.string,
            disabled: PropTypes.bool
        }),
    ).isRequired,
    onClose: PropTypes.func.isRequired
};

export default ContextMenu;
