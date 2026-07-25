import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";

import { closeOnboarding } from "../reducers/modals";

import OnboardingComponent from "../components/onboarding/onboarding.jsx";

const ONBOARDING_API_URL = "https://nomo-kit.com/api/onboarding";

class OnboardingContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            slides: [],
        };
    }

    // Deteksi lingkungan desktop (Electron) atau web
    isDesktop() {
        try {
            return (
                typeof window !== "undefined" &&
                (window.process?.type === "renderer" ||
                    typeof window.electronAPI !== "undefined")
            );
        } catch (e) {
            return false;
        }
    }

    componentDidMount() {
        // Cek localStorage dismissed
        try {
            if (window.localStorage.getItem("nomopro_onboarding_dismissed")) {
                this.props.onRequestClose();
                return;
            }
        } catch (e) {
            // ignore
        }

        const isDesktop = this.isDesktop();

        // Fetch slide dari API
        fetch(ONBOARDING_API_URL)
            .then((r) => r.json())
            .then((res) => {
                if (res.success && res.data && Array.isArray(res.data.slides)) {
                    // Filter slide by platform
                    const slides = res.data.slides.filter((s) => {
                        const p = s.platform;
                        if (!p || p === "all") return true;
                        if (isDesktop) return p === "desktop";
                        return p === "web";
                    });
                    if (slides.length === 0) {
                        // Slides kosong → tutup modal
                        this.props.onRequestClose();
                    } else {
                        this.setState({ slides });
                    }
                } else {
                    this.setState({
                        slides: this.constructor.defaultProps.slides,
                    });
                }
            })
            .catch(() => {
                this.setState({ slides: this.constructor.defaultProps.slides });
            });
    }
    handleClose = () => {
        this.props.onRequestClose();
    };
    handleDismiss = () => {
        try {
            window.localStorage.setItem("nomopro_onboarding_dismissed", "true");
        } catch (e) {
            // ignore
        }
        this.props.onRequestClose();
    };
    render() {
        const slides =
            this.state.slides.length > 0
                ? this.state.slides
                : this.props.slides;
        return (
            <OnboardingComponent
                slides={slides}
                onRequestClose={this.handleClose}
                onDismiss={this.handleDismiss}
            />
        );
    }
}

OnboardingContainer.propTypes = {
    slides: PropTypes.arrayOf(
        PropTypes.shape({
            title: PropTypes.string,
            src: PropTypes.string.isRequired,
            alt: PropTypes.string,
            caption: PropTypes.node,
            platform: PropTypes.string,
        }),
    ),
    onRequestClose: PropTypes.func.isRequired,
};

OnboardingContainer.defaultProps = {
    slides: [
        {
            title: "Selamat Datang",
            src: "https://placehold.co/600x400/4C97FF/white?text=Selamat+Datang",
            alt: "Selamat Datang",
            caption: "Selamat datang di Nomopro!",
        },
        {
            title: "Blok Code",
            src: "https://placehold.co/600x400/0FBD8C/white?text=Blok+Code",
            alt: "Blok Code",
            caption: "Buat program dengan blok kode visual.",
        },
        {
            title: "Python IDE",
            src: "https://placehold.co/600x400/FF8C1A/white?text=Python+IDE",
            alt: "Python IDE",
            caption: "Atau gunakan Python IDE untuk coding tingkat lanjut.",
        },
    ],
};

const mapDispatchToProps = (dispatch) => ({
    onRequestClose: () => dispatch(closeOnboarding()),
});

export default connect(null, mapDispatchToProps)(OnboardingContainer);
