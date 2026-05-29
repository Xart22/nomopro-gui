import React from 'react';
import PropTypes from 'prop-types';
import styles from './landing-page.css';

const blockCodePath1 =
    'M54 50.51C54 50.786 53.776 51.01 53.5 51.01L33.197 51.01' +
    'C33.064 51.01 32.937 51.062 32.844 51.156L32.146 51.854' +
    'C32.053 51.947 31.926 52 31.793 52L28.207 52' +
    'C28.074 52 27.947 51.947 27.854 51.854L27.156 51.156' +
    'C27.062 51.062 26.936 51.01 26.803 51.01L14.5 51.01' +
    'C14.224 51.01 14 50.786 14 50.51V39.5' +
    'C14 39.224 14.224 39 14.5 39L26.793 39' +
    'C26.926 39 27.053 39.053 27.146 39.146L27.854 39.854' +
    'C27.947 39.947 28.074 40 28.207 40L31.793 40' +
    'C31.926 40 32.053 39.947 32.146 39.854L32.854 39.146' +
    'C32.947 39.053 33.074 39 33.207 39L53.5 39' +
    'C53.776 39 54 39.224 54 39.5V50.51Z';

const blockCodePath2 =
    'M58 22.51C58 22.786 57.776 23.01 57.5 23.01L37.197 23.01' +
    'C37.064 23.01 36.937 23.062 36.844 23.156L36.146 23.854' +
    'C36.053 23.947 35.926 24 35.793 24L32.207 24' +
    'C32.074 24 31.947 23.947 31.854 23.854L31.156 23.156' +
    'C31.062 23.062 30.936 23.01 30.803 23.01L18.5 23.01' +
    'C18.224 23.01 18 22.786 18 22.51V11.5' +
    'C18 11.224 18.224 11 18.5 11L30.793 11' +
    'C30.926 11 31.053 11.053 31.146 11.146L31.854 11.854' +
    'C31.947 11.947 32.074 12 32.207 12L35.793 12' +
    'C35.926 12 36.053 11.947 36.146 11.854L36.854 11.146' +
    'C36.947 11.053 37.074 11 37.207 11L57.5 11' +
    'C57.776 11 58 11.224 58 11.5V22.51Z';

const pythonPath1 =
    'M36 8C32.5 8 29.5 8.4 27.3 9.5C24.4 11 24 13.6 24 17v6.5h17V27H22.5' +
    'C19 27 15.8 29.5 14.8 34c-1.3 4.5-1.5 7.5 0 12 1.2 3.8 3.3 7.5 7.2 7.5h5.5' +
    'v-7c0-4.7 3.8-8.5 8.5-8.5H49c3.8 0 6.5-3 6.5-6.7V17c0-4-2.3-6.5-5.8-7.5' +
    'C47 8.2 43 8 36 8z';

const pythonPath2 =
    'M54 28V38c0 5.3-3.7 9.5-9 9.5H31c-4 0-6.5 3.3-6.5 7V62' +
    'c0 4.5 3.7 6.5 7.5 7.5 5.5 1.5 11 1.8 16.5 0' +
    '3.5-1.2 6.5-3.8 6.5-7.5v-8H37v-3.5h22.5c4.5 0 6.3-3.3 7.5-7.5' +
    '2-4.5 1.5-9 0-13.5-1.2-4-3.3-6.5-7.5-6.5H54z';

const LandingPage = ({onSelectJuniorCode, onSelectBlockCode, onSelectPythonIDE}) => (
    <div className={styles.overlay}>
        <div className={styles.container}>
            <div className={styles.title}>Nomokit</div>
            <div className={styles.subtitle}>
                Pilih mode coding yang ingin digunakan
            </div>
            <div className={styles.cards}>
                <div
                    className={styles.card}
                    onClick={onSelectJuniorCode}
                >
                    <svg
                        className={styles.cardIcon}
                        viewBox="0 0 72 72"
                        fill="none"
                    >
                        <rect
                            x="8"
                            y="18"
                            width="24"
                            height="24"
                            rx="5"
                            fill="#FF8C1A"
                        />
                        <rect
                            x="40"
                            y="18"
                            width="24"
                            height="24"
                            rx="5"
                            fill="#4C97FF"
                        />
                        <rect
                            x="24"
                            y="38"
                            width="24"
                            height="24"
                            rx="5"
                            fill="#0FBD8C"
                        />
                        <rect
                            x="8"
                            y="48"
                            width="16"
                            height="14"
                            rx="4"
                            fill="#CF63CF"
                        />
                    </svg>
                    <div className={styles.cardLabel}>Junior Block Code</div>
                    <p className={styles.cardDesc}>
                        Coding visual untuk pemula dengan balok warna-warni
                    </p>
                </div>
                <div
                    className={styles.card}
                    onClick={onSelectBlockCode}
                >
                    <svg
                        className={styles.cardIcon}
                        viewBox="0 0 72 72"
                        fill="none"
                    >
                        <path
                            d={blockCodePath1}
                            fill="#4C97FF"
                        />
                        <path
                            d={blockCodePath2}
                            fill="#4C97FF"
                        />
                    </svg>
                    <div className={styles.cardLabel}>Block Code</div>
                    <p className={styles.cardDesc}>
                        Coding visual dengan Scratch blocks yang interaktif
                    </p>
                </div>
                <div
                    className={styles.card}
                    onClick={onSelectPythonIDE}
                >
                    <svg
                        className={styles.cardIcon}
                        viewBox="0 0 72 72"
                        fill="none"
                    >
                        <path
                            d={pythonPath1}
                            fill="#3776AB"
                        />
                        <path
                            d={pythonPath2}
                            fill="#FFD43B"
                        />
                    </svg>
                    <div className={styles.cardLabel}>Python IDE</div>
                    <p className={styles.cardDesc}>
                        Coding Python tingkat lanjut dengan editor lengkap
                    </p>
                </div>
            </div>
        </div>
    </div>
);

LandingPage.propTypes = {
    onSelectJuniorCode: PropTypes.func.isRequired,
    onSelectBlockCode: PropTypes.func.isRequired,
    onSelectPythonIDE: PropTypes.func.isRequired
};

export default LandingPage;
