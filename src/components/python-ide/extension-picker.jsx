import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import {getPythonExtensions} from './python-ide-config';
import styles from './python-ide.css';

const ExtensionPicker = ({isOpen, onClose, onModuleAdded}) => {
    if (!isOpen) return null;

    const handleAdd = ext => {
        onModuleAdded(ext);
        onClose();
    };

    return (
        <Box
            className={styles.contextMenuOverlay}
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1100
            }}
        >
            <Box
                className={styles.pythonExtensionPicker}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 1101
                }}
            >
                <Box className={styles.pythonExtensionPickerTitle}>
                    Add extension
                </Box>
                <Box className={styles.pythonExtensionPickerList}>
                    {getPythonExtensions().map(ext => (
                        <button
                            key={ext.id}
                            className={styles.pythonExtensionPickerItem}
                            onClick={() => handleAdd(ext)}
                            type="button"
                        >
                            {ext.name}
                        </button>
                    ))}
                </Box>
                <button
                    className={styles.actionButton}
                    onClick={onClose}
                    type="button"
                >
                    Close
                </button>
            </Box>
        </Box>
    );
};

ExtensionPicker.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    onModuleAdded: PropTypes.func.isRequired
};

export default ExtensionPicker;
