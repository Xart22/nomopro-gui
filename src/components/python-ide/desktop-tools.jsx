import React, {useState, useEffect, useRef, useCallback} from 'react';
import Box from '../box/box.jsx';
import styles from './desktop-tools.module.css';

const TABS = ['pip', 'project-deps', 'diagnostic', 'recovery'];

const TAB_LABELS = {
    'pip': '📦 Pip Packages',
    'project-deps': '📋 Project Deps',
    'diagnostic': '🔍 Diagnostics',
    'recovery': '🔧 Recovery'
};

// ============================================================================
// Pip Packages Tab
// ============================================================================
const PipTab = () => {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [installName, setInstallName] = useState('');
    const [installProgress, setInstallProgress] = useState([]);
    const [installing, setInstalling] = useState(false);
    const [classification, setClassification] = useState(null);
    const [cacheInfo, setCacheInfo] = useState(null);
    const [cacheLoading, setCacheLoading] = useState(false);
    const progressCleanupRef = useRef(null);
    const pip = window.electronAPI?.pip;
    const safeInstall = window.electronAPI?.safeInstall;

    useEffect(() => {
        fetchPackages();
        fetchCacheInfo();
        return () => {
            if (progressCleanupRef.current) {
                progressCleanupRef.current();
            }
        };
    }, []);

    const fetchPackages = async () => {
        if (!pip) return;
        setLoading(true);
        setError(null);
        try {
            const r = await pip.list();
            if (r.success) setPackages(r.packages || []);
            else setError(r.error);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCacheInfo = async () => {
        if (!pip) return;
        setCacheLoading(true);
        try {
            const r = await pip.getCacheInfo();
            if (r.success) setCacheInfo(r);
        } catch (e) {
            console.warn(e.message);
        } finally {
            setCacheLoading(false);
        }
    };

    useEffect(() => {
        if (installName.trim().length > 1 && safeInstall) {
            const t = setTimeout(async () => {
                try {
                    const r = await safeInstall.classify(installName.trim());
                    if (r.success) setClassification(r.classification);
                } catch (_) {
                    setClassification(null);
                }
            }, 300);
            return () => clearTimeout(t);
        }
        setClassification(null);
    }, [installName]);

    const handleInstall = async () => {
        if (!pip || !installName.trim() || installing) return;
        setInstalling(true);
        setInstallProgress([]);
        setError(null);

        if (pip.onProgress) {
            progressCleanupRef.current = pip.onProgress(data => {
                setInstallProgress(prev => [...prev, data]);
            });
        }

        try {
            const r = await pip.install(installName.trim());
            if (r.success) {
                setInstallProgress(prev => [
                    ...prev,
                    {
                        type: 'done',
                        message: `✅ Installed ${installName.trim()}`
                    }
                ]);
                setInstallName('');
                fetchPackages();
                fetchCacheInfo();
            } else if (r.locked) {
                setError('Another pip operation is in progress. Please wait.');
            } else {
                setError(r.error || 'Install failed');
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setInstalling(false);
            if (progressCleanupRef.current) {
                progressCleanupRef.current();
                progressCleanupRef.current = null;
            }
        }
    };

    const handleUninstall = async name => {
        if (!pip) return;
        setLoading(true);
        try {
            const r = await pip.uninstall(name);
            if (r.success) {
                fetchPackages();
                fetchCacheInfo();
            } else {
                setError(r.error);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClearCache = async () => {
        if (!pip) return;
        setCacheLoading(true);
        try {
            await pip.clearCache();
            fetchCacheInfo();
        } catch (e) {
            setError(e.message);
        } finally {
            setCacheLoading(false);
        }
    };

    const clsIcon = lvl =>
        (lvl === 'safe' ?
            '🟢' :
            lvl === 'risky' ?
                '🟡' :
                lvl === 'blocked' ?
                    '🔴' :
                    '⚪');

    return (
        <Box className={styles.tabContent}>
            {error && (
                <Box className={styles.error}>
                    {error}
                    <button
                        className={styles.errorDismiss}
                        onClick={() => setError(null)}
                    >
                        ✕
                    </button>
                </Box>
            )}

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>Install Package</Box>
                <Box className={styles.installRow}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Package name (e.g. requests)"
                        value={installName}
                        onChange={e => setInstallName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInstall()}
                        disabled={installing}
                    />
                    <button
                        className={styles.installBtn}
                        onClick={handleInstall}
                        disabled={installing || !installName.trim()}
                    >
                        {installing ? '⏳' : 'Install'}
                    </button>
                </Box>

                {classification && (
                    <Box className={styles.classification}>
                        <span>{clsIcon(classification.level)}</span>
                        <span>
                            <strong>
                                {classification.level.toUpperCase()}
                            </strong>
                            : {classification.reason}
                        </span>
                    </Box>
                )}

                {installProgress.length > 0 && (
                    <Box className={styles.progressLog}>
                        {installProgress.map((p, i) => (
                            <Box
                                key={i}
                                className={styles.progressLine}
                            >
                                {p.type === 'install-output' ?
                                    p.data :
                                    p.message || p.type}
                            </Box>
                        ))}
                        {installing && (
                            <Box className={styles.progressLine}>
                                ⏳ Running...
                            </Box>
                        )}
                    </Box>
                )}
            </Box>

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>
                    Installed Packages ({packages.length})
                    <button
                        className={styles.linkBtn}
                        onClick={fetchPackages}
                        disabled={loading}
                    >
                        🔄
                    </button>
                </Box>
                {loading ? (
                    <Box className={styles.muted}>Loading...</Box>
                ) : packages.length === 0 ? (
                    <Box className={styles.muted}>No packages installed.</Box>
                ) : (
                    <Box className={styles.pkgList}>
                        {packages.map(p => (
                            <Box
                                key={p.name}
                                className={styles.pkgItem}
                            >
                                <Box>
                                    <strong>{p.name}</strong>{' '}
                                    <span className={styles.muted}>
                                        {p.version}
                                    </span>
                                </Box>
                                <button
                                    className={styles.iconBtn}
                                    onClick={() => handleUninstall(p.name)}
                                    title="Uninstall"
                                >
                                    🗑️
                                </button>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>
                    Cache
                    <button
                        className={styles.linkBtn}
                        onClick={handleClearCache}
                    >
                        🗑️ Clear
                    </button>
                </Box>
                {cacheLoading ? (
                    <Box className={styles.muted}>Loading...</Box>
                ) : cacheInfo ? (
                    <Box className={styles.cacheInfo}>
                        <Box>
                            Size:{' '}
                            {cacheInfo.cacheSize ?
                                `${(cacheInfo.cacheSize / 1024 / 1024).toFixed(2)} MB` :
                                '0 B'}
                        </Box>
                        <Box>Files: {cacheInfo.cacheCount ?? 0}</Box>
                    </Box>
                ) : (
                    <Box className={styles.muted}>Cache info unavailable.</Box>
                )}
            </Box>
        </Box>
    );
};

// ============================================================================
// Project Deps Tab
// ============================================================================
const ProjectDepsTab = () => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [projectId, setProjectId] = useState('default');
    const [requirementsText, setRequirementsText] = useState('');
    const [diffResult, setDiffResult] = useState(null);
    const projectDeps = window.electronAPI?.projectDeps;

    useEffect(() => {
        listProfiles();
    }, []);

    const listProfiles = async () => {
        if (!projectDeps) return;
        setLoading(true);
        try {
            const r = await projectDeps.listProfiles();
            if (r.success) setProfiles(r.profiles || []);
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!projectDeps) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await projectDeps.generate(projectId);
            if (r.success) {
                setMessage(`✅ Generated ${r.packageCount} packages`);
                setRequirementsText(r.requirements || '');
                listProfiles();
            } else {
                setMessage(`Error: ${r.error}`);
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInstallRequirements = async () => {
        if (!projectDeps || !requirementsText.trim()) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await projectDeps.install(projectId, requirementsText);
            setMessage(
                r.success ? '✅ Requirements installed' : `Error: ${r.error}`,
            );
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDiff = async () => {
        if (!projectDeps) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await projectDeps.diff(projectId);
            if (r.success) {
                setDiffResult(r);
                setMessage(
                    `📊 ${r.installCount} to install, ${r.removeCount} to remove, ${r.matchCount} match`,
                );
            } else {
                setMessage(`Error: ${r.error}`);
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async pid => {
        if (!projectDeps) return;
        setLoading(true);
        try {
            await projectDeps.deleteProfile(pid);
            listProfiles();
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!projectDeps) return;
        setLoading(true);
        try {
            const r = await projectDeps.export(projectId);
            if (r.success) {
                setRequirementsText(r.requirements || '');
                setMessage(
                    r.exists ? '📋 Exported' : 'No requirements file found',
                );
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className={styles.tabContent}>
            {message && (
                <Box className={styles.info}>
                    {message}
                    <button
                        className={styles.errorDismiss}
                        onClick={() => setMessage(null)}
                    >
                        ✕
                    </button>
                </Box>
            )}

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>
                    Project Dependency Profile
                </Box>
                <Box className={styles.installRow}>
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="Project ID (default)"
                        value={projectId}
                        onChange={e =>
                            setProjectId(e.target.value || 'default')
                        }
                    />
                    <button
                        className={styles.installBtn}
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        📸 Snapshot
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleDiff}
                        disabled={loading}
                    >
                        📊 Diff
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleExport}
                        disabled={loading}
                    >
                        📤 Export
                    </button>
                </Box>
                <textarea
                    className={styles.textarea}
                    rows={4}
                    placeholder="Requirements content (paste here)..."
                    value={requirementsText}
                    onChange={e => setRequirementsText(e.target.value)}
                />
                <button
                    className={styles.installBtn}
                    onClick={handleInstallRequirements}
                    disabled={loading || !requirementsText.trim()}
                >
                    📥 Install Requirements
                </button>
            </Box>

            {diffResult && (
                <Box className={styles.section}>
                    <Box className={styles.sectionTitle}>Diff Result</Box>
                    {diffResult.installCount > 0 && (
                        <Box>
                            <Box className={styles.muted}>
                                To install ({diffResult.installCount}):
                            </Box>
                            {diffResult.toInstall.slice(0, 10).map((l, i) => (
                                <Box
                                    key={i}
                                    className={styles.diffLine}
                                >
                                    + {l}
                                </Box>
                            ))}
                            {diffResult.installCount > 10 && (
                                <Box className={styles.muted}>
                                    ...and {diffResult.installCount - 10} more
                                </Box>
                            )}
                        </Box>
                    )}
                    {diffResult.removeCount > 0 && (
                        <Box>
                            <Box className={styles.muted}>
                                To remove ({diffResult.removeCount}):
                            </Box>
                            {diffResult.toRemove.slice(0, 10).map((l, i) => (
                                <Box
                                    key={i}
                                    className={styles.diffLine}
                                >
                                    - {l}
                                </Box>
                            ))}
                            {diffResult.removeCount > 10 && (
                                <Box className={styles.muted}>
                                    ...and {diffResult.removeCount - 10} more
                                </Box>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>
                    Profiles ({profiles.length})
                    <button
                        className={styles.linkBtn}
                        onClick={listProfiles}
                    >
                        🔄
                    </button>
                </Box>
                {profiles.length === 0 ? (
                    <Box className={styles.muted}>No profiles yet.</Box>
                ) : (
                    profiles.map(p => (
                        <Box
                            key={p.projectId}
                            className={styles.profileItem}
                        >
                            <Box>
                                <strong>{p.projectId}</strong> ({p.packageCount}{' '}
                                packages)
                            </Box>
                            <button
                                className={styles.iconBtn}
                                onClick={() => handleDelete(p.projectId)}
                                title="Delete"
                            >
                                🗑️
                            </button>
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
};

// ============================================================================
// Diagnostic Tab
// ============================================================================
const DiagnosticTab = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const diagnostic = window.electronAPI?.diagnostic;

    const handleCollect = async () => {
        if (!diagnostic) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await diagnostic.collect();
            if (r.success) {
                setReport(r.bundle);
                setMessage('✅ Diagnostic collected');
            } else {
                setMessage(`Error: ${r.error}`);
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReport = async () => {
        if (!diagnostic) return;
        setLoading(true);
        try {
            const r = await diagnostic.saveReport();
            if (r.success) {
                setMessage(`✅ Report saved to ${r.path}`);
            } else {
                setMessage(`Error: ${r.error}`);
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!diagnostic) return;
        setLoading(true);
        try {
            const r = await diagnostic.generateReport();
            if (r.success) {
                setReport(r.bundle);
                setMessage('✅ Report generated');
            } else {
                setMessage(`Error: ${r.error}`);
            }
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className={styles.tabContent}>
            {message && (
                <Box className={styles.info}>
                    {message}
                    <button
                        className={styles.errorDismiss}
                        onClick={() => setMessage(null)}
                    >
                        ✕
                    </button>
                </Box>
            )}

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>Diagnostic Bundle</Box>
                <Box className={styles.btnRow}>
                    <button
                        className={styles.installBtn}
                        onClick={handleCollect}
                        disabled={loading}
                    >
                        🔍 Collect Info
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleGenerateReport}
                        disabled={loading}
                    >
                        📄 Generate Report
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleSaveReport}
                        disabled={loading || !report}
                    >
                        💾 Save Report
                    </button>
                </Box>
            </Box>

            {report && (
                <Box className={styles.section}>
                    <Box className={styles.sectionTitle}>
                        Diagnostic Summary
                        <button
                            className={styles.linkBtn}
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? '▲ Collapse' : '▼ Expand'}
                        </button>
                    </Box>
                    <Box className={styles.diagGrid}>
                        <Box className={styles.diagRow}>
                            <span>OS:</span>
                            <span>{report.platform?.os}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>App Version:</span>
                            <span>{report.app?.version}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Python:</span>
                            <span>{report.python?.version || 'N/A'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Venv:</span>
                            <span>
                                {report.venv?.exists ?
                                    `✅ (${report.venv.packageCount || 0} packages)` :
                                    '❌ Not created'}
                            </span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>File Storage:</span>
                            <span>
                                {report.fileStorage?.exists ?
                                    `✅ (${report.fileStorage.fileCount || 0} files)` :
                                    '❌'}
                            </span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Bundled Python:</span>
                            <span>
                                {report.python?.bundledExists ? '✅' : '❌'}
                            </span>
                        </Box>
                    </Box>

                    {expanded && (
                        <pre className={styles.diagRaw}>
                            {JSON.stringify(report, null, 2)}
                        </pre>
                    )}
                </Box>
            )}
        </Box>
    );
};

// ============================================================================
// Recovery Tab
// ============================================================================
const RecoveryTab = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const recovery = window.electronAPI?.recovery;

    const handleVerify = async () => {
        if (!recovery) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await recovery.verifyPython();
            if (r.success) setStatus(r);
            setMessage(
                r.success ?
                    r.healthy ?
                        '✅ Python runtime is healthy' :
                        '⚠️ Issues found' :
                    `Error: ${r.error}`,
            );
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!recovery) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await recovery.restorePython();
            setMessage(
                r.success ?
                    '✅ Python restored from backup' :
                    r.requiresRedownload ?
                        '⚠️ No backup. Run install script.' :
                        `Error: ${r.error}`,
            );
            if (r.success) handleVerify();
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        if (!recovery) return;
        setLoading(true);
        setMessage(null);
        try {
            const r = await recovery.createBackup();
            setMessage(
                r.success ?
                    `✅ Backup created (${r.sizeMB || '?'} MB)` :
                    `Error: ${r.error}`,
            );
        } catch (e) {
            setMessage(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box className={styles.tabContent}>
            {message && (
                <Box className={styles.info}>
                    {message}
                    <button
                        className={styles.errorDismiss}
                        onClick={() => setMessage(null)}
                    >
                        ✕
                    </button>
                </Box>
            )}

            <Box className={styles.section}>
                <Box className={styles.sectionTitle}>
                    Python Runtime Recovery
                </Box>
                <Box className={styles.btnRow}>
                    <button
                        className={styles.installBtn}
                        onClick={handleVerify}
                        disabled={loading}
                    >
                        🔍 Verify Python
                    </button>
                    <button
                        className={styles.secondaryBtn}
                        onClick={handleBackup}
                        disabled={loading}
                    >
                        💾 Create Backup
                    </button>
                    <button
                        className={styles.dangerBtn}
                        onClick={handleRestore}
                        disabled={loading}
                    >
                        🔧 Restore Python
                    </button>
                </Box>
            </Box>

            {status && (
                <Box className={styles.section}>
                    <Box className={styles.sectionTitle}>
                        Verification Result
                    </Box>
                    <Box className={styles.diagGrid}>
                        <Box className={styles.diagRow}>
                            <span>Exists:</span>
                            <span>{status.exists ? '✅' : '❌'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Python exe:</span>
                            <span>{status.pythonExe || '❌'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Version:</span>
                            <span>{status.pythonVersion || 'N/A'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Corrupt:</span>
                            <span>{status.corrupt ? '⚠️ Yes' : '✅ No'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Healthy:</span>
                            <span>{status.healthy ? '✅ Yes' : '❌ No'}</span>
                        </Box>
                        <Box className={styles.diagRow}>
                            <span>Size:</span>
                            <span>{status.totalSizeMB || '?'} MB</span>
                        </Box>
                    </Box>
                    {status.issues?.length > 0 && (
                        <Box>
                            <Box className={styles.muted}>Issues:</Box>
                            {status.issues.map((iss, i) => (
                                <Box
                                    key={i}
                                    className={styles.issueLine}
                                >
                                    ⚠️ {iss}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
};

// ============================================================================
// Main DesktopTools Component
// ============================================================================
const DesktopTools = ({isOpen, onClose}) => {
    const [activeTab, setActiveTab] = useState('pip');

    const isDesktop =
        typeof window !== 'undefined' &&
        (window.electronAPI?.pip || window.electronAPI?.diagnostic);

    if (!isOpen) return null;

    return (
        <Box
            className={styles.overlay}
            onClick={onClose}
        >
            <Box
                className={styles.modal}
                onClick={e => e.stopPropagation()}
            >
                <Box className={styles.header}>
                    <span className={styles.title}>🛠️ Desktop Tools</span>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </Box>

                {!isDesktop ? (
                    <Box className={styles.notAvailable}>
                        <p>
                            Desktop Tools are only available in the desktop app.
                        </p>
                        <p>
                            Please use the desktop version of Nomopro for
                            package management and system tools.
                        </p>
                        <p>Features include:</p>
                        <ul>
                            <li>
                                📦 Manage pip packages with install/uninstall
                                and cache control
                            </li>
                            <li>
                                📋 Project dependency profiling and requirements
                                management
                            </li>
                            <li>
                                🔍 Collect diagnostic information and generate
                                reports
                            </li>
                        </ul>
                    </Box>
                ) : (
                    <>
                        <Box className={styles.tabs}>
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {TAB_LABELS[tab]}
                                </button>
                            ))}
                        </Box>

                        {activeTab === 'pip' && <PipTab />}
                        {activeTab === 'project-deps' && <ProjectDepsTab />}
                        {activeTab === 'diagnostic' && <DiagnosticTab />}
                        {activeTab === 'recovery' && <RecoveryTab />}
                    </>
                )}
            </Box>
        </Box>
    );
};

export default DesktopTools;
