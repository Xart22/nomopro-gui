const SET_NAME = 'scratch-gui/connection-modal/setName';
const CLEAR_NAME = 'scratch-gui/connection-modal/clearName';
const SET_PERIPHERAL_ID = 'scratch-gui/connection-modal/setPeripheralId';
const CLEAR_PERIPHERAL_ID = 'scratch-gui/connection-modal/clearPeripheralId';
const SET_REALTIME_PROTOCAL_CONNECTION = 'scratch-gui/connection-modal/setRealtimeConnection';
const SET_LIST_ALL = 'scratch-gui/connection-modal/setListAll';

const initialState = {
    peripheralName: null,
    peripheralId: null,
    realtimeConnection: false,
    isListAll: false
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
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
    case SET_REALTIME_PROTOCAL_CONNECTION:
        return Object.assign({}, state, {
            realtimeConnection: action.isConnected
        });
    case SET_LIST_ALL:
        return Object.assign({}, state, {
            isListAll: action.isListAll
        });
    default:
        return state;
    }
};

const setConnectionModalPeripheralName = function (peripheralName) {
    return {
        type: SET_NAME,
        peripheralName: peripheralName
    };
};

const clearConnectionModalPeripheralName = function () {
    return {
        type: CLEAR_NAME
    };
};

const setConnectionModalPeripheralId = function (peripheralId) {
    return {
        type: SET_PERIPHERAL_ID,
        peripheralId: peripheralId
    };
};

const clearConnectionModalPeripheralId = function () {
    return {
        type: CLEAR_PERIPHERAL_ID
    };
};

const setRealtimeConnection = function (isConnected) {
    return {
        type: SET_REALTIME_PROTOCAL_CONNECTION,
        isConnected: isConnected
    };
};

const setListAll = function (isListAll) {
    return {
        type: SET_LIST_ALL,
        isListAll: isListAll
    };
};

export {
    reducer as default,
    initialState as connectionModalInitialState,
    setConnectionModalPeripheralName,
    clearConnectionModalPeripheralName,
    setConnectionModalPeripheralId,
    clearConnectionModalPeripheralId,
    setRealtimeConnection,
    setListAll
};
