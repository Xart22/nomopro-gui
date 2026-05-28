import {
    MODE_BLOCK as INPUT_MODE_BLOCK,
    MODE_PYTHON as INPUT_MODE_PYTHON,
    isValidMode,
    normalizeMode
} from '../lib/modeState';

const SET_INPUT_MODE = 'scratch-gui/input-mode/SET_INPUT_MODE';

const initialState = {
    mode: INPUT_MODE_BLOCK
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_INPUT_MODE:
        if (!isValidMode(action.mode)) {
            return state;
        }
        return Object.assign({}, state, {
            mode: normalizeMode(action.mode)
        });
    default:
        return state;
    }
};

const setInputMode = function (mode) {
    return {
        type: SET_INPUT_MODE,
        mode
    };
};

const setBlockMode = function () {
    return setInputMode(INPUT_MODE_BLOCK);
};

const setPythonMode = function () {
    return setInputMode(INPUT_MODE_PYTHON);
};

export {
    reducer as default,
    initialState as inputModeInitialState,
    INPUT_MODE_BLOCK,
    INPUT_MODE_PYTHON,
    setInputMode,
    setBlockMode,
    setPythonMode
};
