import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ConnectionModalComponent, {PHASES} from '../components/connection-modal/connection-modal.jsx';
import VM from 'openblock-vm';
import analytics from '../lib/analytics';
import {connect} from 'react-redux';
import {closeConnectionModal} from '../reducers/modals';
import {
    setConnectionModalPeripheralName,
    setConnectionModalPeripheralId,
    setListAll
} from '../reducers/connection-modal';
import {setFirmwareMode} from '../reducers/device';

class ConnectionModal extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleScanning',
            'handleCancel',
            'handleConnected',
            'handleConnecting',
            'handleDisconnect',
            'handleError',
            'handleHelp',
            'handleFlash',
            'handlePeripheralListUpdate',
            'handleUploadStdout',
            'handleUploadSuccess',
            'handleUploadError'
        ]);
        this.state = {
            device: this.props.deviceData.find(device => device.deviceId === props.deviceId),
            phase: props.vm.getPeripheralIsConnected(props.deviceId) ?
                PHASES.connected : PHASES.scanning,
            peripheralName: null,
            peripheralId: null,
            peripheralList: [],
            errorMessage: null,
            flashing: false,
            flashProgress: 0,
            flashLog: '',
            flashError: null
        };
    }
    componentDidMount () {
        this.props.vm.on('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.on('PERIPHERAL_REQUEST_ERROR', this.handleError);
        this.props.vm.on('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.on('PERIPHERAL_UPLOAD_STDOUT', this.handleUploadStdout);
        this.props.vm.on('PERIPHERAL_UPLOAD_SUCCESS', this.handleUploadSuccess);
        this.props.vm.on('PERIPHERAL_UPLOAD_ERROR', this.handleUploadError);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleConnected);
        this.props.vm.removeListener('PERIPHERAL_REQUEST_ERROR', this.handleError);
        this.props.vm.removeListener('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_STDOUT', this.handleUploadStdout);
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_SUCCESS', this.handleUploadSuccess);
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_ERROR', this.handleUploadError);
    }
    handleScanning () {
        this.setState({
            phase: PHASES.scanning
        });
    }
    handleConnecting (peripheralId, peripheralName) {
        if (this.props.isRealtimeMode) {
            this.props.vm.connectPeripheral(this.props.deviceId, peripheralId);
        } else {
            this.props.vm.connectPeripheral(this.props.deviceId, peripheralId, parseInt(this.props.baudrate, 10));
        }
        this.setState({
            phase: PHASES.connecting,
            peripheralName: peripheralName,
            peripheralId: peripheralId
        });
        analytics.event({
            category: 'devices',
            action: 'connecting',
            label: this.props.deviceId
        });
    }
    handleDisconnect () {
        try {
            this.props.vm.disconnectPeripheral(this.props.deviceId);
        } finally {
            this.props.onCancel();
        }
    }
    handleCancel () {
        try {
            if (this.state.phase !== PHASES.connected &&
                this.props.vm.getPeripheralIsConnected(this.props.deviceId)) {
                this.props.vm.disconnectPeripheral(this.props.deviceId);
            }
        } finally {
            this.props.onCancel();
        }
    }
    handleError (err) {
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
                category: 'devices',
                action: 'connecting error',
                label: this.props.deviceId
            });
        }
    }
    handleConnected () {
        this.setState({
            phase: PHASES.connected
        });
        analytics.event({
            category: 'devices',
            action: 'connected',
            label: this.props.deviceId
        });
        this.props.onConnected(this.state.peripheralName);
        if (this.state.peripheralId) {
            this.props.onSetPeripheralId(this.state.peripheralId);
        }
    }
    handleHelp () {
        window.open(this.state.device.helpLink, '_blank');
        analytics.event({
            category: 'devices',
            action: 'device help',
            label: this.props.deviceId
        });
    }
    handlePeripheralListUpdate (newList) {
        const peripheralArray = Object.keys(newList).map(id => newList[id]);
        this.setState({peripheralList: peripheralArray});
    }
    handleUploadStdout (data) {
        const text = data?.message || data?.text || String(data || '');
        this.setState({flashLog: text});
        const pctMatch = text.match(/[[(](\d+)\s*%[\])]/);
        if (pctMatch) {
            this.setState({flashProgress: parseInt(pctMatch[1], 10)});
        }
    }
    handleUploadSuccess () {
        this.setState({flashing: false, flashProgress: 100, phase: PHASES.scanning});
        this.props.onSetFirmwareMode('microPython');
    }
    handleUploadError (data) {
        const msg = data?.message || (data?.params?.message) || 'Unknown error';
        this.setState({flashing: false, flashError: msg});
    }
    _extractSerialPort (pathOrName) {
        if (!pathOrName) return pathOrName;
        // Windows friendly name: "USB-SERIAL CP2102 (COM6)" -> "COM6"
        const match = pathOrName.match(/\((COM\d+)\)/i);
        if (match) return match[1];
        return pathOrName;
    }
    handleFlash () {
        this.setState({flashing: true, flashProgress: 0, flashLog: '', flashError: null});

        try {
            const rawPeripheralId = this.state.peripheralId ||
                this.props.peripheralId ||
                (this.state.peripheralList && this.state.peripheralList.length > 0 ?
                    this.state.peripheralList[0].peripheralId :
                    null);

            if (!rawPeripheralId) {
                this.setState({flashing: false, flashError: 'No device selected. Please scan for devices first.'});
                return;
            }

            const BOARD_MAP = {
                arduinoEsp32: 'esp32',
                arduinoEsp8266NodeMCU: 'esp8266',
                arduinoRaspberryPiPico: 'rpi_pico',
                microbitV2: 'microbit'
            };
            const rawBoard = (this.state.device && this.state.device.deviceId) || 'esp32';
            const board = BOARD_MAP[rawBoard] || rawBoard;

            const peripheral = this.props.vm.runtime.peripheralExtensions?.[this.props.deviceId];
            if (peripheral && typeof peripheral.micropythonUpload === 'function') {
                // Route through VM -> Link Server (handles disconnect/reconnect internally)
                peripheral.micropythonUpload('', {flashOnly: true, board});
                return;
            }

            this.setState({flashing: false, flashError: 'MicroPython flash not supported for this device.'});
        } catch (e) {
            this.setState({flashing: false, flashError: e.message});
        }
    }
    render () {
        const device = this.state.device;
        const isMicroPython = device && Array.isArray(device.tags) && device.tags.includes('microPython');
        return (
            <ConnectionModalComponent
                connectingMessage={device && device.connectingMessage}
                connectionIconURL={device && device.connectionIconURL}
                connectionSmallIconURL={device && device.connectionSmallIconURL}
                errorMessage={this.state.errorMessage}
                isSerialport={device && device.serialportRequired}
                isListAll={this.props.isListAll}
                connectionTipIconURL={device && device.connectionTipIconURL}
                deviceId={this.props.deviceId}
                name={device && device.name}
                phase={this.state.phase}
                title={this.props.deviceId}
                useAutoScan={device && device.useAutoScan}
                vm={this.props.vm}
                showFlashButton={isMicroPython}
                flashing={this.state.flashing}
                flashProgress={this.state.flashProgress}
                flashLog={this.state.flashLog}
                flashError={this.state.flashError}
                onFlash={this.handleFlash}
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

ConnectionModal.propTypes = {
    baudrate: PropTypes.string.isRequired,
    deviceId: PropTypes.string.isRequired,
    deviceData: PropTypes.instanceOf(Array).isRequired,
    isRealtimeMode: PropTypes.bool,
    isListAll: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onConnected: PropTypes.func.isRequired,
    onClickListAll: PropTypes.func.isRequired,
    onSetFirmwareMode: PropTypes.func,
    onSetPeripheralId: PropTypes.func,
    peripheralId: PropTypes.string,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    baudrate: state.scratchGui.hardwareConsole.baudrate,
    deviceData: state.scratchGui.deviceData.deviceData,
    deviceId: state.scratchGui.device.deviceId,
    isRealtimeMode: state.scratchGui.programMode.isRealtimeMode,
    isListAll: state.scratchGui.connectionModal.isListAll,
    peripheralId: state.scratchGui.connectionModal.peripheralId
});

const mapDispatchToProps = dispatch => ({
    onCancel: () => {
        dispatch(closeConnectionModal());
    },
    onConnected: peripheralName => {
        dispatch(setConnectionModalPeripheralName(peripheralName));
    },
    onClickListAll: state => {
        dispatch(setListAll(state));
    },
    onSetPeripheralId: id => {
        dispatch(setConnectionModalPeripheralId(id));
    },
    onSetFirmwareMode: mode => {
        dispatch(setFirmwareMode(mode));
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ConnectionModal);
