import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ScanningStepComponent from '../components/connection-modal/scanning-step.jsx';
import VM from 'openblock-vm';

class ScanningStep extends React.Component {
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
        // @todo: stop the peripheral scan here
        this.props.vm.removeListener(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.removeListener(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    scanForPeripheral (listAll) {
        this.props.vm.scanForPeripheral(this.props.deviceId, listAll);
    }
    handlePeripheralScanTimeout () {
        this.setState({
            scanning: false,
            peripheralList: []
        });
    }
    handlePeripheralListUpdate (newList) {
        // TODO: sort peripherals by signal strength? so they don't jump around
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
                flashError={this.props.flashError}
                flashProgress={this.props.flashProgress}
                flashing={this.props.flashing}
                isSerialport={this.props.isSerialport}
                isListAll={this.props.isListAll}
                peripheralList={this.state.peripheralList}
                phase={this.state.phase}
                scanning={this.state.scanning}
                showFlashButton={this.props.showFlashButton}
                title={this.props.deviceId}
                onConnected={this.props.onConnected}
                onConnecting={this.props.onConnecting}
                onFlash={this.props.onFlash}
                onClickListAll={this.handleClickListAll}
                onRefresh={this.handleRefresh}
            />
        );
    }
}

ScanningStep.propTypes = {
    connectionSmallIconURL: PropTypes.string,
    flashError: PropTypes.string,
    flashProgress: PropTypes.number,
    flashing: PropTypes.bool,
    isSerialport: PropTypes.bool.isRequired,
    isListAll: PropTypes.bool.isRequired,
    deviceId: PropTypes.string.isRequired,
    onConnected: PropTypes.func.isRequired,
    onConnecting: PropTypes.func.isRequired,
    onFlash: PropTypes.func,
    onClickListAll: PropTypes.func.isRequired,
    showFlashButton: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default ScanningStep;
