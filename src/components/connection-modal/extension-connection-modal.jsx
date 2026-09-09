import PropTypes from 'prop-types';
import React from 'react';
import keyMirror from 'keymirror';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import ExtensionScanningStep from '../../containers/extension-scanning-step.jsx';
import ExtensionAutoScanningStep from '../../containers/extension-auto-scanning-step.jsx';
import ConnectingStep from './connecting-step.jsx';
import ConnectedStep from './connected-step.jsx';
import ErrorStep from './error-step.jsx';
import UnavailableStep from './unavailable-step.jsx';

import styles from './connection-modal.css';

const PHASES = keyMirror({
    scanning: null,
    connecting: null,
    connected: null,
    error: null,
    unavailable: null
});

const ExtensionConnectionModalComponent = props => (
    <Modal
        className={styles.modalContent}
        contentLabel={props.name}
        headerClassName={styles.header}
        headerImage={props.connectionSmallIconURL}
        id="extensionConnectionModal"
        onHelp={props.onHelp}
        onRequestClose={props.onCancel}
    >
        <Box className={styles.body}>
            {props.phase === PHASES.scanning && !props.useAutoScan && <ExtensionScanningStep {...props} />}
            {props.phase === PHASES.scanning && props.useAutoScan && <ExtensionAutoScanningStep {...props} />}
            {props.phase === PHASES.connecting && <ConnectingStep {...props} />}
            {props.phase === PHASES.connected && <ConnectedStep {...props} />}
            {props.phase === PHASES.error && <ErrorStep {...props} />}
            {props.phase === PHASES.unavailable && <UnavailableStep {...props} />}
        </Box>
    </Modal>
);

ExtensionConnectionModalComponent.propTypes = {
    connectingMessage: PropTypes.node,
    connectionSmallIconURL: PropTypes.string,
    connectionTipIconURL: PropTypes.string,
    extensionId: PropTypes.string.isRequired,
    name: PropTypes.node,
    onCancel: PropTypes.func.isRequired,
    onHelp: PropTypes.func.isRequired,
    phase: PropTypes.oneOf(Object.keys(PHASES)).isRequired,
    title: PropTypes.string,
    useAutoScan: PropTypes.bool
};

ExtensionConnectionModalComponent.defaultProps = {
    connectingMessage: 'Connecting'
};

export {
    ExtensionConnectionModalComponent as default,
    PHASES
};
