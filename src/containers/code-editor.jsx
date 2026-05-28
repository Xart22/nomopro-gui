import React from 'react';
import bindAll from 'lodash.bindall';

import CodeEditorComponent from '../components/code-editor/code-editor.jsx';

// eslint-disable-next-line react/prefer-stateless-function
class CodeEditor extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, ['handleSize', 'containerRef']);
        this.state = {
            clientHeight: null,
            clientWidth: null
        };
    }

    componentDidMount () {
        window.addEventListener('resize', this.handleSize);
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.handleSize);
            if (this.containerElement) {
                this.resizeObserver.observe(this.containerElement);
            }
        }
        this.handleSize();
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.handleSize);
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    handleSize () {
        if (!this.containerElement) return;
        this.setState({
            clientHeight: this.containerElement.getBoundingClientRect().height,
            clientWidth: this.containerElement.getBoundingClientRect().width
        });
    }

    containerRef (el) {
        if (el) {
            this.containerElement = el;
            if (this.resizeObserver) {
                this.resizeObserver.observe(this.containerElement);
            }
            this.setState({
                clientHeight:
                    this.containerElement.getBoundingClientRect().height,
                clientWidth:
                    this.containerElement.getBoundingClientRect().width
            });
        }
    }

    render () {
        const {width, height, ...props} = this.props;
        const editorWidth = width || this.state.clientWidth || 1;
        const editorHeight = height || this.state.clientHeight || 320;
        return (
            <CodeEditorComponent
                height={editorHeight}
                width={editorWidth}
                containerRef={this.containerRef}
                {...props}
            />
        );
    }
}

export default CodeEditor;
