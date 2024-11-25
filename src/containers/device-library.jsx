import bindAll from "lodash.bindall";
import PropTypes from "prop-types";
import React from "react";
import VM from "openblock-vm";
import { connect } from "react-redux";
import { compose } from "redux";
import { defineMessages, injectIntl, intlShape } from "react-intl";

import analytics from "../lib/analytics";
import { setDeviceData } from "../reducers/device-data";

import { makeDeviceLibrary } from "../lib/libraries/devices/index.jsx";

import LibraryComponent from "../components/library/library.jsx";
import deviceIcon from "../components/action-menu/icon--sprite.svg";
import Cookies from "js-cookie";
import LoaderComponent from "../components/loader/loader.jsx";

const messages = defineMessages({
    deviceTitle: {
        defaultMessage: "Choose an Device",
        description: "Heading for the device library",
        id: "gui.deviceLibrary.chooseADevice",
    },
    deviceUrl: {
        defaultMessage: "Enter the URL of the device",
        description: "Prompt for unoffical device url",
        id: "gui.deviceLibrary.deviceUrl",
    },
    arduinoTag: {
        defaultMessage: "Arduino",
        description: "Arduino tag to filter all arduino devices.",
        id: "gui.deviceLibrary.arduinoTag",
    },
    microPythonTag: {
        defaultMessage: "MicroPython",
        description: "Micro python tag to filter all micro python devices.",
        id: "gui.deviceLibrary.microPythonTag",
    },
    kitTag: {
        defaultMessage: "Kit",
        description: "Kit tag to filter all kit devices.",
        id: "gui.deviceLibrary.kitTag",
    },
});

const ARDUINO_TAG = { tag: "Arduino", intlLabel: messages.arduinoTag };
const MICROPYTHON_TAG = {
    tag: "MicroPython",
    intlLabel: messages.microPythonTag,
};
const KIT_TAG = { tag: "Kit", intlLabel: messages.kitTag };
const tagListPrefix = [ARDUINO_TAG, MICROPYTHON_TAG, KIT_TAG];
// const API_URL = "https://staging-nomokit.sonajaya.com";
const API_URL = "https://nomo-kit.com";
// const API_URL = "http://localhost:8000";
const { electronAPI } = window;
class DeviceLibrary extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            nomoproSubStatus: false,
            externalUserKitData: [],
            isLoading: true,
        };
        bindAll(this, ["handleItemSelect", "requestLoadDevice"]);
    }

    getData() {
        // Send the event to get the data
        if (typeof electronAPI !== "undefined" && electronAPI.getUserData) {
            electronAPI.getUserData(""); // Send the event to get the data
        } else {
            console.log("Electron API is not available in the browser");
        }
    }
    componentDidMount() {
        this.getData();

        if (typeof electronAPI !== "undefined" && electronAPI.getUserData) {
            electronAPI.on("responseUserData", (event, userData) => {
                this.fetchUserData(userData.id); // Proceed after getting userId from Electron
            });
        } else {
            const userId = Cookies.get("user_id"); // Fallback to user_id from cookies
            this.fetchUserData(userId);
        }

        this.props.vm.extensionManager
            .getDeviceList()
            .then((data) => {
                this.props.onSetDeviceData(makeDeviceLibrary(data));
            })
            .catch(() => {
                this.props.onSetDeviceData(makeDeviceLibrary());
            });
    }

    fetchUserData(userId) {
        if (!userId) {
            console.error("User ID is undefined. Cannot fetch user data.");
            this.setState({ isLoading: false });
            return;
        }

        fetch(`${API_URL}/api/user/${userId}/kits`)
            .then((response) => response.json())
            .then((data) => {
                this.setState({
                    nomoproSubStatus: data.is_active_subs,
                    externalUserKitData: data.kit_external_id,
                    isLoading: false,
                });
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
                this.setState({ isLoading: false });
            });
    }

    requestLoadDevice(device) {
        const id = device.deviceId;
        const deviceType = device.type;
        const pnpidList = device.pnpidList;
        const deviceExtensions = device.deviceExtensions;

        if (id && !device.disabled) {
            if (this.props.vm.extensionManager.isDeviceLoaded(id)) {
                this.props.onDeviceSelected(id);
            } else {
                this.props.vm.extensionManager
                    .loadDeviceURL(id, deviceType, pnpidList)
                    .then(() => {
                        this.props.vm.extensionManager
                            .getDeviceExtensionsList()
                            .then(() => {
                                // TODO: Add a event for install device extension
                                // the large extensions will take many times to load
                                // A loading interface should be launched.
                                this.props.vm.installDeviceExtensions(
                                    Object.assign([], deviceExtensions)
                                );
                            });
                        this.props.onDeviceSelected(id);
                        analytics.event({
                            category: "devices",
                            action: "select device",
                            label: id,
                        });
                    });
            }
        }
    }

    handleItemSelect(item) {
        this.requestLoadDevice(item);
        this.props.onRequestClose();
    }

    render() {
        const { externalUserKitData } = this.state;
        if (this.state.isLoading === true) {
            // Render loading or placeholder component
            return <LoaderComponent messageId={"gui.loader.headlineDevice"} />;
        }
        const deviceLibraryThumbnailData2 = this.props.deviceData.map(
            (device) => {
                // Check if device's deviceId exists in fetchedData
                const deviceExists =
                    (Array.isArray(this.state.externalUserKitData) &&
                        this.state.externalUserKitData.some(
                            (externalDevice) =>
                                externalDevice.kit_external_id ===
                                device.deviceId
                        )) ||
                    (this.state.nomoproSubStatus == true &&
                        device.nomoproSubsItem);

                return {
                    rawURL: device.iconURL || deviceIcon,
                    available: deviceExists, // Set available to true if deviceId exists in fetchedData
                    ...device,
                };
            }
        );

        return (
            <LibraryComponent
                data={deviceLibraryThumbnailData2}
                filterable
                tags={tagListPrefix}
                id="deviceLibrary"
                title={this.props.intl.formatMessage(messages.deviceTitle)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

DeviceLibrary.propTypes = {
    deviceData: PropTypes.instanceOf(Array).isRequired,
    intl: intlShape.isRequired,
    onDeviceSelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    onSetDeviceData: PropTypes.func.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired, // eslint-disable-line react/no-unused-prop-types
};

const mapStateToProps = (state) => ({
    deviceData: state.scratchGui.deviceData.deviceData,
});

const mapDispatchToProps = (dispatch) => ({
    onSetDeviceData: (data) => dispatch(setDeviceData(data)),
});
export default compose(
    injectIntl,
    connect(mapStateToProps, mapDispatchToProps)
)(DeviceLibrary);
