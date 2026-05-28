import React from 'react';
import Box from '../box/box.jsx';
import styles from './input-modal.module.css';

const InputModal = ({
    isOpen,
    title,
    placeholder,
    onConfirm,
    onCancel,
    defaultValue = ''
}) => {
    const [inputValue, setInputValue] = React.useState(defaultValue);

    const handleConfirm = () => {
        if (inputValue.trim()) {
            onConfirm(inputValue.trim());
            setInputValue('');
        }
    };

    const handleCancel = () => {
        setInputValue('');
        onCancel();
    };

    const handleKeyDown = e => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <Box className={styles['input-modal-overlay']}>
            <Box className={styles['input-modal']}>
                <Box className={styles['input-modal-header']}>
                    <span>{title}</span>
                </Box>
                <Box className={styles['input-modal-content']}>
                    <input
                        type="text"
                        className={styles['input-modal-input']}
                        placeholder={placeholder}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                </Box>
                <Box className={styles['input-modal-footer']}>
                    <button
                        className={styles['input-modal-btn-cancel']}
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles['input-modal-btn-confirm']}
                        onClick={handleConfirm}
                        disabled={!inputValue.trim()}
                    >
                        OK
                    </button>
                </Box>
            </Box>
        </Box>
    );
};

export default InputModal;
