import React from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';
import TreeFileItem from './python-ide-tree-file.jsx';
import styles from './python-ide.css';

const SortFiles = (a, b) => {
    if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
};

const FileTreeView = ({
    fileTree,
    expandedFolderIds,
    selectedFolderId,
    activeTargetId,
    onToggleFolderExpand,
    onSelectFolder,
    onSelectFile,
    onContextMenu
}) => {
    const renderTree = (parentId = null, level = 0) => {
        const items = (fileTree || [])
            .filter(item => item.parentId === parentId)
            .sort(SortFiles);

        return items.map(item => {
            const indent = level * 24;
            if (item.type === 'folder') {
                const isExpanded = expandedFolderIds?.has(item.id);
                const isSelected = selectedFolderId === item.id;
                return (
                    <div
                        key={item.id}
                        className={styles.treeBranch}
                    >
                        <Box
                            className={`${styles.treeRow} ${isSelected ? styles.treeRowSelected : ''}`}
                            style={{paddingLeft: `${indent}px`}}
                        >
                            <button
                                className={styles.folderToggle}
                                onClick={() => onToggleFolderExpand?.(item.id)}
                                type="button"
                                style={{marginRight: '2px'}}
                            >
                                {isExpanded ? '▼' : '▶'}
                            </button>
                            <button
                                className={isSelected ? styles.folderItemActive : styles.folderItem}
                                onClick={() => onSelectFolder?.(item.id)}
                                onContextMenu={e => onContextMenu?.(e, item)}
                                type="button"
                            >
                                <span className={styles.treeItemIcon}>
                                    {isExpanded ? '📂' : '📁'}
                                </span>
                                <span className={styles.folderName}>{item.name}</span>
                                {isSelected && (
                                    <span className={styles.folderActiveBadge}>active</span>
                                )}
                            </button>
                        </Box>
                        {isExpanded && (
                            <div className={styles.treeChildren}>
                                {renderTree(item.id, level + 1)}
                            </div>
                        )}
                    </div>
                );
            }
            return (
                <TreeFileItem
                    key={item.id}
                    item={item}
                    level={level}
                    isActive={activeTargetId === item.targetId}
                    onSelect={() => {
                        onSelectFile?.(item.targetId);
                        onSelectFolder?.(null);
                    }}
                    onContext={e => onContextMenu?.(e, item)}
                />
            );
        });
    };

    return renderTree();
};

FileTreeView.propTypes = {
    fileTree: PropTypes.array,
    expandedFolderIds: PropTypes.object,
    selectedFolderId: PropTypes.string,
    activeTargetId: PropTypes.string,
    onToggleFolderExpand: PropTypes.func,
    onSelectFolder: PropTypes.func,
    onSelectFile: PropTypes.func,
    onContextMenu: PropTypes.func
};

export default FileTreeView;
