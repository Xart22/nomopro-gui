import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ScanningStepComponent from '../components/connection-modal/scanning-step.jsx';
import VM from 'openblock-vm';

class ExtensionScanningStep extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handlePeripheralListUpdate',
            'handlePeripheralScanTimeout',
            'handleClickListAll',
            'handleRefresh'
        ]);
        this.state = {
            scanning: true,
            peripheralList: []
        };
    }
    componentDidMount () {
        this.scanForPeripheral(this.props.isListAll);
        this.props.vm.on(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.on(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    componentWillUnmount () {
        this.props.vm.removeListener(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.removeListener(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    scanForPeripheral (listAll) {
        // Isolated BLE path: only the extension id (e.g. 'wedo2') is used.
        // Device flow (arduino/microbit serial) is never touched here.
        if (!this.props.extensionId) return;
        this.props.vm.scanForPeripheral(this.props.extensionId, listAll);
    }
    handlePeripheralScanTimeout () {
        this.setState({
            scanning: false,
            peripheralList: []
        });
    }
    handlePeripheralListUpdate (newList) {
        const peripheralArray = Object.keys(newList).map(id =>
            newList[id]
        );
        this.setState({peripheralList: peripheralArray});
    }
    handleClickListAll () {
        this.props.onClickListAll(!this.props.isListAll);
        this.scanForPeripheral(!this.props.isListAll);
    }
    handleRefresh () {
        this.scanForPeripheral(this.props.isListAll);
        this.setState({
            scanning: true,
            peripheralList: []
        });
    }
    render () {
        return (
            <ScanningStepComponent
                connectionSmallIconURL={this.props.connectionSmallIconURL}
                flashing={false}
                isSerialport={false}
                isListAll={this.props.isListAll}
                peripheralList={this.state.peripheralList}
                phase={this.state.phase}
                scanning={this.state.scanning}
                showFlashButton={false}
                title={this.props.extensionId}
                onConnected={this.props.onConnected}
                onConnecting={this.props.onConnecting}
                onClickListAll={this.handleClickListAll}
                onRefresh={this.handleRefresh}
            />
        );
    }
}

ExtensionScanningStep.propTypes = {
    connectionSmallIconURL: PropTypes.string,
    extensionId: PropTypes.string.isRequired,
    isListAll: PropTypes.bool.isRequired,
    onConnected: PropTypes.func.isRequired,
    onConnecting: PropTypes.func.isRequired,
    onClickListAll: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default ExtensionScanningStep;
