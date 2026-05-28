import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import Box from '../box/box.jsx';
import PeripheralTile from './peripheral-tile.jsx';
import Dots from './dots.jsx';

import radarIcon from './icons/searching.png';
import refreshIcon from './icons/refresh.svg';

import styles from './connection-modal.css';

const ScanningStep = props => (
    <Box className={styles.body}>
        {props.isSerialport ? (
            <Box className={classNames(styles.bodyHeadArea)}>
                <div className={styles.listAll}>
                    <FormattedMessage
                        defaultMessage="Show all connectable devices"
                        description="Button in prompt for show all connectable devices"
                        id="gui.connection.scanning.listAll"
                    />
                </div>
                <div className={styles.checkBox}>
                    <input
                        type="checkbox"
                        name="hexform"
                        checked={props.isListAll}
                        onChange={props.onClickListAll}
                    />
                </div>
            </Box>
        ) : null}
        <Box className={styles.activityArea}>
            {props.scanning ? (
                props.peripheralList.length === 0 ? (
                    <div className={styles.activityAreaInfo}>
                        <div className={styles.centeredRow}>
                            <img
                                className={classNames(styles.radarSmall, styles.radarSpin)}
                                src={radarIcon}
                            />
                            <FormattedMessage
                                defaultMessage="Looking for devices"
                                description="Text shown while scanning for devices"
                                id="gui.connection.scanning.lookingforperipherals"
                            />
                        </div>
                    </div>
                ) : (
                    <div className={styles.peripheralTilePane}>
                        {props.peripheralList.map(peripheral =>
                            (<PeripheralTile
                                connectionSmallIconURL={props.connectionSmallIconURL}
                                key={peripheral.peripheralId}
                                name={peripheral.name}
                                peripheralId={peripheral.peripheralId}
                                rssi={peripheral.rssi}
                                isSerialport={props.isSerialport}
                                onConnecting={props.onConnecting}
                            />)
                        )}
                    </div>
                )
            ) : (
                <Box className={styles.instructions}>
                    <FormattedMessage
                        defaultMessage="No devices found"
                        description="Text shown when no devices could be found"
                        id="gui.connection.scanning.noPeripheralsFound"
                    />
                </Box>
            )}
        </Box>
        <Box className={styles.bottomArea}>
            <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                <FormattedMessage
                    defaultMessage="Select your device in the list above."
                    description="Prompt for choosing a device to connect to"
                    id="gui.connection.scanning.instructions"
                />
            </Box>
            <Dots
                className={styles.bottomAreaItem}
                counter={0}
                total={3}
            />
            <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                {props.showFlashButton && (
                    <button
                        className={styles.connectionButton}
                        onClick={props.onFlash}
                        disabled={props.flashing || props.peripheralList.length === 0}
                    >
                        {props.flashing ? (
                            <FormattedMessage
                                defaultMessage="Flashing..."
                                description="Flashing in progress"
                                id="gui.connection.flashing"
                            />
                        ) : (
                            <FormattedMessage
                                defaultMessage="Flash MicroPython"
                                description="Button to flash MicroPython firmware"
                                id="gui.connection.flashMicropython"
                            />
                        )}
                    </button>
                )}
                <button
                    className={classNames(styles.bottomAreaItem, styles.connectionButton)}
                    onClick={props.onRefresh}
                    disabled={props.flashing}
                >
                    <FormattedMessage
                        defaultMessage="Refresh"
                        description="Button in prompt for starting a search"
                        id="gui.connection.search"
                    />
                    <img
                        className={styles.buttonIconRight}
                        src={refreshIcon}
                    />
                </button>
            </Box>
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
        </Box>
    </Box>
);

ScanningStep.propTypes = {
    connectionSmallIconURL: PropTypes.string,
    flashError: PropTypes.string,
    flashProgress: PropTypes.number,
    flashing: PropTypes.bool,
    isListAll: PropTypes.bool.isRequired,
    isSerialport: PropTypes.bool,
    onClickListAll: PropTypes.func.isRequired,
    onConnecting: PropTypes.func,
    onFlash: PropTypes.func,
    onRefresh: PropTypes.func,
    peripheralList: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string,
        rssi: PropTypes.number,
        peripheralId: PropTypes.string
    })),
    scanning: PropTypes.bool.isRequired,
    showFlashButton: PropTypes.bool
};

ScanningStep.defaultProps = {
    peripheralList: [],
    scanning: true
};

export default ScanningStep;
