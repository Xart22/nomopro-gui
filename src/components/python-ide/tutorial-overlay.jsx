import React, {useState, useEffect, useCallback} from 'react';
import PropTypes from 'prop-types';
import Box from '../box/box.jsx';

const TUTORIAL_STEPS = [
    {
        title: 'Welcome to Python IDE',
        description:
            'This is the Python coding environment. Write and run Python scripts that control your Scratch sprites, stage, and more.',
        highlightSelector: null,
        tooltipPosition: 'center'
    },
    {
        title: 'Project Files',
        description:
            'The sidebar shows all your project files. Each sprite and the stage have their own Python file. Click a file to edit its code.',
        highlightSelector: '[data-tutorial="sidebar"]',
        tooltipPosition: 'right'
    },
    {
        title: 'Code Editor',
        description:
            'Write Python code here. The editor supports syntax highlighting, auto-completion, and more. Changes are saved automatically.',
        highlightSelector: '[data-tutorial="editor-area"]',
        tooltipPosition: 'left'
    },
    {
        title: 'Run & Stop',
        description:
            'Click "Run" to execute the active file, or "Run All" to execute all files. Use "Stop" to interrupt a running script.',
        highlightSelector: '[data-tutorial="terminal-toolbar"]',
        tooltipPosition: 'top'
    },
    {
        title: 'Terminal Output',
        description:
            "The terminal shows your program's output in real time. You can search, copy, clear, or scroll the output using the toolbar.",
        highlightSelector: '[data-tutorial="terminal-area"]',
        tooltipPosition: 'top'
    },
    {
        title: 'Modules & Extensions',
        description:
            'Add Python modules and Scratch extensions to enhance your projects. Click the + button to browse available extensions.',
        highlightSelector: '[data-tutorial="modules-section"]',
        tooltipPosition: 'top'
    },
    {
        title: "You're Ready!",
        description:
            'You can restart this tutorial anytime from the menu. Happy coding!',
        highlightSelector: null,
        tooltipPosition: 'center'
    }
];

const TutorialOverlay = ({
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    dontShowAgain,
    onDontShowAgainChange
}) => {
    const [highlightRect, setHighlightRect] = useState(null);
    const step = TUTORIAL_STEPS[currentStep];

    const updateHighlight = useCallback(() => {
        if (step.highlightSelector) {
            const el = document.querySelector(step.highlightSelector);
            if (el) {
                const rect = el.getBoundingClientRect();
                setHighlightRect({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                });
                return;
            }
        }
        setHighlightRect(null);
    }, [step.highlightSelector]);

    const tooltipPos =
        highlightRect || !step.highlightSelector ?
            step.tooltipPosition :
            'center';

    useEffect(() => {
        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        return () => window.removeEventListener('resize', updateHighlight);
    }, [updateHighlight]);

    const tooltipStyle = {
        center: {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        },
        right: highlightRect ?
            {
                position: 'fixed',
                left: `${highlightRect.left + highlightRect.width + 16}px`,
                top: `${highlightRect.top + highlightRect.height / 2}px`,
                transform: 'translateY(-50%)',
                maxWidth: '320px'
            } :
            {display: 'none'},
        left: highlightRect ?
            {
                position: 'fixed',
                right: `${
                    window.innerWidth - highlightRect.left + 16
                }px`,
                top: `${highlightRect.top + highlightRect.height / 2}px`,
                transform: 'translateY(-50%)',
                maxWidth: '320px'
            } :
            {display: 'none'},
        top: highlightRect ?
            {
                position: 'fixed',
                left: `${highlightRect.left + highlightRect.width / 2}px`,
                bottom: `${
                    window.innerHeight - highlightRect.top + 16
                }px`,
                transform: 'translateX(-50%)',
                maxWidth: '320px'
            } :
            {display: 'none'},
        bottom: highlightRect ?
            {
                position: 'fixed',
                left: `${highlightRect.left + highlightRect.width / 2}px`,
                top: `${highlightRect.top + highlightRect.height + 16}px`,
                transform: 'translateX(-50%)',
                maxWidth: '320px'
            } :
            {display: 'none'}
    };

    const tooltipCard = (
        <Box
            style={{
                pointerEvents: 'auto',
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                padding: '20px 24px',
                minWidth: '280px',
                maxWidth: '400px'
            }}
        >
            <Box
                style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}
            >
                Step {currentStep + 1} of {totalSteps}
            </Box>
            <Box
                style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: 10,
                    color: '#222'
                }}
            >
                {step.title}
            </Box>
            <Box
                style={{
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                    color: '#555',
                    marginBottom: 16
                }}
            >
                {step.description}
            </Box>
            <label
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    color: '#777',
                    cursor: 'pointer',
                    marginBottom: 16,
                    userSelect: 'none'
                }}
            >
                <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={e => onDontShowAgainChange(e.target.checked)}
                    style={{cursor: 'pointer'}}
                />
                Don&apos;t show this tutorial again
            </label>
            <Box
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
            >
                <Box style={{display: 'flex', gap: 8}}>
                    <button
                        onClick={onPrev}
                        disabled={currentStep === 0}
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            background: '#f5f5f5',
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: currentStep === 0 ? 'default' : 'pointer',
                            opacity: currentStep === 0 ? 0.4 : 1,
                            color: '#444'
                        }}
                    >
                        &lt; Prev
                    </button>
                    <button
                        onClick={onNext}
                        style={{
                            border: 'none',
                            borderRadius: 6,
                            background: '#4c97ff',
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#fff'
                        }}
                    >
                        {currentStep === totalSteps - 1 ? 'Done' : 'Next >'}
                    </button>
                </Box>
                <button
                    onClick={onSkip}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '6px 10px',
                        fontSize: '0.82rem',
                        color: '#999',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    Skip
                </button>
            </Box>
            <Box
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 14
                }}
            >
                {Array.from({length: totalSteps}).map((_, i) => (
                    <Box
                        key={i}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: i === currentStep ? '#4c97ff' : '#ddd',
                            transition: 'background 200ms ease'
                        }}
                    />
                ))}
            </Box>
        </Box>
    );

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1300,
                pointerEvents: 'none'
            }}
        >
            {highlightRect ? (
                <>
                    {/* Cutout — dark shadow covers everything except the target */}
                    <Box
                        style={{
                            position: 'fixed',
                            left: `${highlightRect.left}px`,
                            top: `${highlightRect.top}px`,
                            width: `${highlightRect.width}px`,
                            height: `${highlightRect.height}px`,
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                            borderRadius: '4px',
                            zIndex: 1301,
                            pointerEvents: 'auto',
                            border: '2px solid #4c97ff'
                        }}
                    />
                    {/* Tooltip card — bright white on top of dark shadow */}
                    <Box
                        style={{
                            ...tooltipStyle[tooltipPos],
                            pointerEvents: 'auto',
                            zIndex: 1302
                        }}
                    >
                        {tooltipCard}
                    </Box>
                </>
            ) : (
                <Box
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.35)',
                        pointerEvents: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {tooltipCard}
                </Box>
            )}
        </Box>
    );
};

TutorialOverlay.propTypes = {
    currentStep: PropTypes.number.isRequired,
    totalSteps: PropTypes.number.isRequired,
    onNext: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    onSkip: PropTypes.func.isRequired,
    dontShowAgain: PropTypes.bool,
    onDontShowAgainChange: PropTypes.func
};

export {TutorialOverlay, TUTORIAL_STEPS};
export default TutorialOverlay;
