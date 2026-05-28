import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import Dots from './dots.jsx';
import bluetoothIcon from './icons/bluetooth-white.svg';
import usbIcon from './icons/usb-white.svg';
import styles from './connection-modal.css';
import classNames from 'classnames';

const ConnectedStep = props => (
    <Box className={styles.body}>
        <Box className={styles.activityArea}>
            <Box className={styles.centeredRow}>
                <div className={styles.peripheralActivity}>
                    <img
                        className={styles.peripheralActivityIcon}
                        src={props.connectionIconURL}
                    />
                    {props.isSerialport ? (
                        <img
                            className={styles.bluetoothConnectingIcon}
                            src={usbIcon}
                        />) :
                        (
                            <img
                                className={styles.bluetoothConnectingIcon}
                                src={bluetoothIcon}
                            />)}
                </div>
            </Box>
        </Box>
        <Box className={styles.bottomArea}>
            <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                <FormattedMessage
                    defaultMessage="Connected"
                    description="Message indicating that a device was connected"
                    id="gui.connection.connected"
                />
            </Box>
            <Dots
                success
                className={styles.bottomAreaItem}
                total={3}
            />
            <div className={classNames(styles.bottomAreaItem, styles.cornerButtons)}>
                {props.showFlashButton && (
                    <button
                        className={styles.connectionButton}
                        onClick={props.onFlash}
                        disabled={props.flashing}
                    >
                        {props.flashing ? (
                            <FormattedMessage
                                defaultMessage="Flashing..."
                                description="Flashing in progress"
                                id="gui.connection.flashing"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Re-flash MicroPython"
                                description="Button to re-flash MicroPython firmware"
                                id="gui.connection.reflashMicropython"
                            />
                        )}
                    </button>
                )}
                <button
                    className={classNames(styles.redButton, styles.connectionButton)}
                    onClick={props.onDisconnect}
                    disabled={props.flashing}
                >
                    <FormattedMessage
                        defaultMessage="Disconnect"
                        description="Button to disconnect the device"
                        id="gui.connection.disconnect"
                    />
                </button>
                <button
                    className={styles.connectionButton}
                    onClick={props.onCancel}
                    disabled={props.flashing}
                >
                    <FormattedMessage
                        defaultMessage="Go to Editor"
                        description="Button to return to the editor"
                        id="gui.connection.go-to-editor"
                    />
                </button>
            </div>
            {props.flashError && (
                <Box className={styles.bottomAreaItem}>
                    <span style={{color: '#FF661A', fontSize: '12px'}}>{props.flashError}</span>
                </Box>
            )}
            {props.flashProgress > 0 && props.flashProgress < 100 && (
                <Box className={styles.bottomAreaItem}>
                    <div
                        style={{
                            width: '100%',
                            height: '6px',
                            background: '#ddd',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginTop: '4px'
                        }}
                    >
                        <div
                            style={{
                                width: `${props.flashProgress}%`,
                                height: '100%',
                                background: '#4C97FF',
                                transition: 'width 0.3s'
                            }}
                        />
                    </div>
                </Box>
            )}
            {props.flashLog && (
                <Box className={styles.bottomAreaItem}>
                    <pre
                        style={{
                            color: '#333',
                            fontSize: '11px',
                            maxHeight: '120px',
                            overflow: 'auto',
                            background: '#f5f5f5',
                            padding: '6px',
                            borderRadius: '3px',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        }}
                    >
                        {props.flashLog}
                    </pre>
                </Box>
            )}
        </Box>
    </Box>
);

ConnectedStep.propTypes = {
    connectionIconURL: PropTypes.string.isRequired,
    flashError: PropTypes.string,
    flashLog: PropTypes.string,
    flashProgress: PropTypes.number,
    flashing: PropTypes.bool,
    isSerialport: PropTypes.bool,
    onCancel: PropTypes.func,
    onDisconnect: PropTypes.func,
    onFlash: PropTypes.func,
    showFlashButton: PropTypes.bool
};

export default ConnectedStep;
