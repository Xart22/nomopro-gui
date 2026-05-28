import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import styles from './python-ide.css';

const ModuleRow = ({module, onRemove}) => (
    <Box className={styles.moduleLibraryRow}>
        <button className={styles.fileItem}>{module.name}</button>
        {!module.core && (
            <button
                className={styles.moduleRemoveButton}
                onClick={() => onRemove(module.name)}
                title={`Remove ${module.name}`}
                type="button"
            >
                x
            </button>
        )}
    </Box>
);

ModuleRow.propTypes = {
    module: PropTypes.shape({name: PropTypes.string, core: PropTypes.bool})
        .isRequired,
    onRemove: PropTypes.func.isRequired
};

export default ModuleRow;
