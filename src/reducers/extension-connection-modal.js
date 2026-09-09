const SET_EXTENSION_ID = 'scratch-gui/extension-connection-modal/setExtensionId';
const CLEAR_EXTENSION_ID = 'scratch-gui/extension-connection-modal/clearExtensionId';
const SET_NAME = 'scratch-gui/extension-connection-modal/setName';
const CLEAR_NAME = 'scratch-gui/extension-connection-modal/clearName';
const SET_PERIPHERAL_ID = 'scratch-gui/extension-connection-modal/setPeripheralId';
const CLEAR_PERIPHERAL_ID = 'scratch-gui/extension-connection-modal/clearPeripheralId';

const initialState = {
    extensionId: null,
    peripheralName: null,
    peripheralId: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_EXTENSION_ID:
        return Object.assign({}, state, {
            extensionId: action.extensionId
        });
    case CLEAR_EXTENSION_ID:
        return Object.assign({}, state, {
            extensionId: null
        });
    case SET_NAME:
        return Object.assign({}, state, {
            peripheralName: action.peripheralName
        });
    case CLEAR_NAME:
        return Object.assign({}, state, {
            peripheralName: null
        });
    case SET_PERIPHERAL_ID:
        return Object.assign({}, state, {
            peripheralId: action.peripheralId
        });
    case CLEAR_PERIPHERAL_ID:
        return Object.assign({}, state, {
            peripheralId: null
        });
    default:
        return state;
    }
};

const setExtensionConnectionModalExtensionId = function (extensionId) {
    return {
        type: SET_EXTENSION_ID,
        extensionId: extensionId
    };
};

const clearExtensionConnectionModalExtensionId = function () {
    return {
        type: CLEAR_EXTENSION_ID
    };
};

const setExtensionConnectionModalPeripheralName = function (peripheralName) {
    return {
        type: SET_NAME,
        peripheralName: peripheralName
    };
};

const clearExtensionConnectionModalPeripheralName = function () {
    return {
        type: CLEAR_NAME
    };
};

const setExtensionConnectionModalPeripheralId = function (peripheralId) {
    return {
        type: SET_PERIPHERAL_ID,
        peripheralId: peripheralId
    };
};

const clearExtensionConnectionModalPeripheralId = function () {
    return {
        type: CLEAR_PERIPHERAL_ID
    };
};

export {
    reducer as default,
    initialState as extensionConnectionModalInitialState,
    setExtensionConnectionModalExtensionId,
    clearExtensionConnectionModalExtensionId,
    setExtensionConnectionModalPeripheralName,
    clearExtensionConnectionModalPeripheralName,
    setExtensionConnectionModalPeripheralId,
    clearExtensionConnectionModalPeripheralId
};
