import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ExtensionConnectionModalComponent, {PHASES} from '../components/connection-modal/extension-connection-modal.jsx';
import VM from 'openblock-vm';
import analytics from '../lib/analytics';
import {connect} from 'react-redux';
import {closeExtensionConnectionModal} from '../reducers/modals';
import {
    setExtensionConnectionModalPeripheralName,
    setExtensionConnectionModalPeripheralId
} from '../reducers/extension-connection-modal';
import {setListAll} from '../reducers/connection-modal';
import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';

class ExtensionConnectionModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleScanning',
            'handleCancel',
            'handleConnected',
            'handleConnecting',
            'handleDisconnect',
            'handleError',
            'handleHelp'
        ]);
        const extension = extensionLibraryContent.find(ext => ext.extensionId === props.extensionId);
        this.state = {
            extension: extension,
            phase: props.vm.getPeripheralIsConnected(props.extensionId) ?
                PHASES.connected : PHASES.scanning,
            peripheralName: null,
            peripheralId: null,
            peripheralList: [],
            errorMessage: null
        };
    }
    componentDidMount () {
        this.props.vm.on('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.on('PERIPHERAL_REQUEST_ERROR', this.handleError);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.removeListener('PERIPHERAL_REQUEST_ERROR', this.handleError);
    }
    handleScanning () {
        this.setState({
            phase: PHASES.scanning
        });
    }
    handleHelp () {
        const extension = this.state.extension || {};
        if (extension.helpLink) {
            window.open(extension.helpLink, '_blank');
        }
    }
    handleConnecting (peripheralId, peripheralName) {
        // Isolated extension BLE path. Device id (arduino/microbit) is never used here.
        if (!this.props.extensionId) return;
        this.props.vm.connectPeripheral(this.props.extensionId, peripheralId);
        this.setState({
            phase: PHASES.connecting,
            peripheralName: peripheralName,
            peripheralId: peripheralId
        });
        analytics.event({
            category: 'extensions',
            action: 'connecting',
            label: this.props.extensionId
        });
    }
    handleDisconnect () {
        try {
            if (this.props.extensionId) {
                this.props.vm.disconnectPeripheral(this.props.extensionId);
            }
        } finally {
            this.props.onCancel();
        }
    }
    handleCancel () {
        try {
            if (this.state.phase !== PHASES.connected &&
                this.props.extensionId &&
                this.props.vm.getPeripheralIsConnected(this.props.extensionId)) {
                this.props.vm.disconnectPeripheral(this.props.extensionId);
            }
        } finally {
            this.props.onCancel();
        }
    }
    handleError (err) {
        // Only handle errors for this extension. Device errors carry deviceId.
        if (err && err.deviceId && err.deviceId !== this.props.extensionId) return;
        if (this.state.phase === PHASES.scanning || this.state.phase === PHASES.unavailable) {
            this.setState({
                phase: PHASES.unavailable
            });
        } else {
            this.setState({
                phase: PHASES.error,
                errorMessage: err.message
            });
            analytics.event({
                category: 'extensions',
                action: 'connecting error',
                label: this.props.extensionId
            });
        }
    }
    handleConnected () {
        this.setState({
            phase: PHASES.connected
        });
        analytics.event({
            category: 'extensions',
            action: 'connected',
            label: this.props.extensionId
        });
        this.props.onConnected(this.state.peripheralName);
        if (this.state.peripheralId) {
            this.props.onSetPeripheralId(this.state.peripheralId);
        }
    }
    render () {
        const extension = this.state.extension || {};
        // Only BLE peripheral extensions are supported here. Currently wedo2.
        // Unknown extension ids render nothing to avoid breaking device flow.
        if (!extension || !extension.extensionId || !extension.launchPeripheralConnectionFlow) {
            return null;
        }
        return (
            <ExtensionConnectionModalComponent
                connectingMessage={extension.connectingMessage}
                connectionIconURL={extension.connectionIconURL}
                connectionSmallIconURL={extension.connectionSmallIconURL}
                connectionTipIconURL={extension.connectionTipIconURL}
                extensionId={this.props.extensionId}
                name={extension.name}
                phase={this.state.phase}
                title={this.props.extensionId}
                useAutoScan={extension.useAutoScan}
                vm={this.props.vm}
                isListAll={this.props.isListAll}
                onCancel={this.handleCancel}
                onConnected={this.handleConnected}
                onConnecting={this.handleConnecting}
                onClickListAll={this.props.onClickListAll}
                onDisconnect={this.handleDisconnect}
                onHelp={this.handleHelp}
                onScanning={this.handleScanning}
            />
        );
    }
}

ExtensionConnectionModal.propTypes = {
    extensionId: PropTypes.string.isRequired,
    isListAll: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onConnected: PropTypes.func.isRequired,
    onClickListAll: PropTypes.func.isRequired,
    onSetPeripheralId: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    extensionId: state.scratchGui.extensionConnectionModal.extensionId,
    isListAll: state.scratchGui.connectionModal.isListAll
});

const mapDispatchToProps = dispatch => ({
    onCancel: () => {
        dispatch(closeExtensionConnectionModal());
    },
    onConnected: peripheralName => {
        dispatch(setExtensionConnectionModalPeripheralName(peripheralName));
    },
    onClickListAll: state => {
        dispatch(setListAll(state));
    },
    onSetPeripheralId: id => {
        dispatch(setExtensionConnectionModalPeripheralId(id));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ExtensionConnectionModal);
