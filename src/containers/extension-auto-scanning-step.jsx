import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ScanningStepComponent, {PHASES} from '../components/connection-modal/auto-scanning-step.jsx';
import VM from 'openblock-vm';

class ExtensionAutoScanningStep extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handlePeripheralListUpdate',
            'handlePeripheralScanTimeout',
            'handleStartScan',
            'handleRefresh'
        ]);
        this.state = {
            phase: PHASES.prescan
        };
    }
    componentWillUnmount () {
        this.unbindPeripheralUpdates();
    }
    handlePeripheralScanTimeout () {
        this.setState({
            phase: PHASES.notfound
        });
        this.unbindPeripheralUpdates();
    }
    handlePeripheralListUpdate (newList) {
        const peripheralArray = Object.keys(newList).map(id =>
            newList[id]
        );
        if (peripheralArray.length > 0) {
            this.props.onConnecting(peripheralArray[0].peripheralId);
        }
    }
    bindPeripheralUpdates () {
        this.props.vm.on(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.on(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    unbindPeripheralUpdates () {
        this.props.vm.removeListener(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.removeListener(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    handleRefresh () {
        this.setState({
            phase: PHASES.prescan
        });
        this.unbindPeripheralUpdates();
    }
    handleStartScan () {
        if (!this.props.extensionId) return;
        this.bindPeripheralUpdates();
        this.props.vm.scanForPeripheral(this.props.extensionId);
        this.setState({
            phase: PHASES.pressbutton
        });
    }
    render () {
        return (
            <ScanningStepComponent
                connectionTipIconURL={this.props.connectionTipIconURL}
                phase={this.state.phase}
                title={this.props.extensionId}
                onRefresh={this.handleRefresh}
                onStartScan={this.handleStartScan}
            />
        );
    }
}

ExtensionAutoScanningStep.propTypes = {
    connectionTipIconURL: PropTypes.string,
    extensionId: PropTypes.string.isRequired,
    onConnecting: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default ExtensionAutoScanningStep;
