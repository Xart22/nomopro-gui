/* eslint-disable react/jsx-no-literals, no-control-regex */
import React, {useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import styles from './upload-toolbar.css';

const firmwareColors = {
    micropython: '#4CAF50',
    arduino: '#FF9800',
    unknown: '#9E9E9E',
    checking: '#2196F3',
    error: '#F44336'
};

const firmwareLabels = {
    micropython: 'MicroPython Ready',
    arduino: 'Arduino Firmware (Flash MicroPython first)',
    unknown: 'Not detected',
    checking: 'Detecting...',
    error: 'Detection error'
};

const UploadToolbar = ({
    firmwareStatus,
    isUploading,
    uploadProgress,
    uploadLog,
    onSwitchToVM,
    onFlashFirmware,
    onDetectFirmware,
    onUploadRun,
    onUploadOnly,
    onStopBoard
}) => {
    const sentinelRef = useRef(null);

    useEffect(() => {
        sentinelRef.current?.scrollIntoView({behavior: 'auto'});
    }, [uploadLog]);

    return (
        <div className={styles.uploadToolbar}>
            <div className={styles.modeRow}>
                <div className={styles.modeSwitch}>
                    <button
                        className={styles.vmButton}
                        onClick={onSwitchToVM}
                        title="Switch to VM Python mode"
                    >
                        ← VM Mode
                    </button>
                    <span className={styles.modeActive}>MicroPython</span>
                </div>

                <div className={styles.firmwareStatus}>
                    <span
                        className={styles.statusDot}
                        style={{backgroundColor: firmwareColors[firmwareStatus] || '#9E9E9E'}}
                    />
                    <span className={styles.statusText}>
                        {firmwareLabels[firmwareStatus] || firmwareStatus}
                    </span>
                    <button
                        className={styles.detectBtn}
                        onClick={onDetectFirmware}
                        disabled={isUploading}
                        title="Re-check firmware"
                    >
                        ↻
                    </button>
                </div>
            </div>

            <div className={styles.actionRow}>
                <button
                    className={styles.flashBtn}
                    onClick={onFlashFirmware}
                    disabled={isUploading}
                    title="Flash MicroPython firmware to board"
                >
                    Flash Firmware
                </button>

                <button
                    className={styles.uploadRunBtn}
                    onClick={onUploadRun}
                    disabled={isUploading}
                    title="Upload main.py and run on board"
                >
                    Upload & Run
                </button>

                <button
                    className={styles.uploadOnlyBtn}
                    onClick={onUploadOnly}
                    disabled={isUploading}
                    title="Upload main.py only (no reset)"
                >
                    Upload Only
                </button>

                <button
                    className={styles.stopBtn}
                    onClick={onStopBoard}
                    disabled={isUploading}
                    title="Soft reset board (Ctrl+D)"
                >
                    Reset
                </button>
            </div>

            {(isUploading || uploadProgress.stage) ? (
                <div className={styles.progressRow}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{width: `${uploadProgress.percent || 0}%`}}
                        />
                    </div>
                    <span className={styles.progressText}>
                        {uploadProgress.text ?
                            uploadProgress.text.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r?\n/g, ' ')
                                .slice(-80) :
                            uploadProgress.stage === 'flash' ? 'Flashing...' :
                                uploadProgress.stage === 'upload' ? 'Uploading...' :
                                    ''}
                        {uploadProgress.percent > 0 && !uploadProgress.text ? ` ${uploadProgress.percent}%` : ''}
                    </span>
                </div>
            ) : null}

            {uploadLog && uploadLog.length > 0 && (
                <div className={styles.logArea}>
                    {uploadLog.map((line, i) => (
                        <div
                            key={i}
                            className={styles.logLine}
                        >
                            {line.replace(/\x1b\[[0-9;]*m/g, '').replace(/\r\n?/g, '')}
                        </div>
                    ))}
                    <div ref={sentinelRef} />
                </div>
            )}
        </div>
    );
};

UploadToolbar.propTypes = {
    firmwareStatus: PropTypes.string,
    isUploading: PropTypes.bool,
    uploadProgress: PropTypes.shape({
        stage: PropTypes.string,
        percent: PropTypes.number,
        text: PropTypes.string
    }),
    uploadLog: PropTypes.arrayOf(PropTypes.string),
    onSwitchToVM: PropTypes.func,
    onFlashFirmware: PropTypes.func,
    onDetectFirmware: PropTypes.func,
    onUploadRun: PropTypes.func,
    onUploadOnly: PropTypes.func,
    onStopBoard: PropTypes.func
};

UploadToolbar.defaultProps = {
    firmwareStatus: 'unknown',
    isUploading: false,
    uploadProgress: {stage: '', percent: 0},
    uploadLog: []
};

export default UploadToolbar;
