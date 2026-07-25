import React from "react";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import classNames from "classnames";

import Box from "../box/box.jsx";
import Modal from "../../containers/modal.jsx";

import styles from "./onboarding.css";

const OVERLAY_ZINDEX = 1400;

const OnboardingComponent = (props) => {
    const [slideIndex, setSlideIndex] = React.useState(0);

    // Inject CSS global: semua ReactModal overlay paksa z-index 1400
    React.useEffect(() => {
        const styleId = "onboarding-zindex-override";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = `
                .ReactModal__Overlay {
                    z-index: ${OVERLAY_ZINDEX} !important;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);
    const totalSlides = props.slides.length;

    const prevSlide = () => {
        setSlideIndex((i) => (i === 0 ? totalSlides - 1 : i - 1));
    };
    const nextSlide = () => {
        setSlideIndex((i) => (i === totalSlides - 1 ? 0 : i + 1));
    };
    const goToSlide = (i) => setSlideIndex(i);

    const slide = props.slides[slideIndex] || {};

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={slide.title || props.title}
            id="onboardingModal"
            onRequestClose={props.onRequestClose}
            shouldCloseOnOverlayClick
            closeButtonVisible
        >
            <Box className={styles.body}>
                {/* Slide counter */}
                {totalSlides > 1 ? (
                    <Box className={styles.counter}>
                        {slideIndex + 1}/{totalSlides}
                    </Box>
                ) : null}

                {/* Gambar */}
                <Box className={styles.carouselViewport}>
                    {props.slides.map((s, i) => (
                        <img
                            key={i}
                            className={classNames(styles.image, {
                                [styles.imageActive]: i === slideIndex,
                                [styles.imagePrev]:
                                    i ===
                                    (slideIndex === 0
                                        ? totalSlides - 1
                                        : slideIndex - 1),
                            })}
                            draggable={false}
                            src={s.src}
                            alt={s.alt || ""}
                        />
                    ))}
                </Box>

                {/* Konten HTML dari API */}
                {slide.content ? (
                    <Box
                        className={styles.caption}
                        dangerouslySetInnerHTML={{ __html: slide.content }}
                    />
                ) : slide.caption ? (
                    <Box className={styles.caption}>{slide.caption}</Box>
                ) : null}

                {/* Navigasi */}
                {totalSlides > 1 ? (
                    <Box className={styles.nav}>
                        <button
                            className={classNames(
                                styles.navBtn,
                                styles.prevBtn,
                            )}
                            onClick={prevSlide}
                            type="button"
                            aria-label="Previous"
                        >
                            &#8249;
                        </button>
                        <Box className={styles.dots}>
                            {props.slides.map((s, i) => (
                                <button
                                    key={i}
                                    className={classNames(styles.dot, {
                                        [styles.dotActive]: i === slideIndex,
                                    })}
                                    onClick={() => goToSlide(i)}
                                    type="button"
                                    aria-label={`Go to slide ${i + 1}`}
                                />
                            ))}
                        </Box>
                        <button
                            className={classNames(
                                styles.navBtn,
                                styles.nextBtn,
                            )}
                            onClick={nextSlide}
                            type="button"
                            aria-label="Next"
                        >
                            &#8250;
                        </button>
                    </Box>
                ) : null}

                {/* Tombol aksi */}
                <Box className={styles.actions}>
                    {props.onDismiss ? (
                        <button
                            className={styles.dismissBtn}
                            onClick={props.onDismiss}
                            type="button"
                        >
                            <FormattedMessage
                                defaultMessage="Jangan tampilkan lagi"
                                description="Button to dismiss onboarding permanently"
                                id="gui.onboarding.dismiss"
                            />
                        </button>
                    ) : null}
                    <button
                        className={styles.closeBtn}
                        onClick={props.onRequestClose}
                        type="button"
                    >
                        <FormattedMessage
                            defaultMessage="Tutup"
                            description="Button to close onboarding modal"
                            id="gui.onboarding.close"
                        />
                    </button>
                </Box>
            </Box>
        </Modal>
    );
};

OnboardingComponent.propTypes = {
    title: PropTypes.string,
    slides: PropTypes.arrayOf(
        PropTypes.shape({
            src: PropTypes.string.isRequired,
            alt: PropTypes.string,
            caption: PropTypes.node,
            is_desktop: PropTypes.bool,
        }),
    ).isRequired,
    onDismiss: PropTypes.func,
    onRequestClose: PropTypes.func.isRequired,
};

export default OnboardingComponent;
