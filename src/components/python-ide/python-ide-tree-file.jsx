import React from 'react';
import PropTypes from 'prop-types';
import styles from './python-ide.css';

const TreeFileItem = ({item, isActive, onSelect, onContext, level = 0}) => (
    <button
        className={isActive ? styles.treeFileItemActive : styles.treeFileItem}
        onClick={onSelect}
        onContextMenu={onContext}
        type="button"
        style={{paddingLeft: `${24 + (level * 24)}px`}}
    >
        <span className={styles.treeItemIcon}>{isActive ? '📝' : '📄'}</span>
        <span className={styles.fileName}>{item.name}</span>
    </button>
);

TreeFileItem.propTypes = {
    item: PropTypes.shape({name: PropTypes.string, targetId: PropTypes.string}).isRequired,
    isActive: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
    onContext: PropTypes.func.isRequired,
    level: PropTypes.number
};

export default TreeFileItem;
