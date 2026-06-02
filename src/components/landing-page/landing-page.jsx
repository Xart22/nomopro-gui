import React from "react";
import PropTypes from "prop-types";
import styles from "./landing-page.css";
import nomokitJrIcon from "./nomokit-jr.png";
import nomoProIcon from "./nomo.png";

const LandingPage = ({
    onSelectJuniorCode,
    onSelectBlockCode,
    onSelectPythonIDE,
}) => (
    <div className={styles.overlay}>
        <div className={styles.container}>
            <div className={styles.title}>Nomokit</div>
            <div className={styles.subtitle}>
                Pilih mode coding yang ingin digunakan
            </div>
            <div className={styles.cards}>
                <div className={styles.card} onClick={onSelectJuniorCode}>
                    <img
                        className={styles.cardIcon}
                        src={nomokitJrIcon}
                        alt="Nomokit Jr"
                    />
                    <div className={styles.cardLabel}>Nomokit Jr</div>
                    <p className={styles.cardDesc}>
                        Coding blocks untuk pemula dengan balok warna-warni
                    </p>
                </div>
                <div className={styles.card} onClick={onSelectBlockCode}>
                    <img
                        className={styles.cardIcon}
                        src={nomoProIcon}
                        alt="Nomo Pro"
                    />
                    <div className={styles.cardLabel}>Nomo Pro</div>
                    <p className={styles.cardDesc}>
                        Coding blocks yang interaktif
                    </p>
                </div>
                <div className={styles.card} onClick={onSelectPythonIDE}>
                    <img
                        className={styles.cardIcon}
                        src={nomoProIcon}
                        alt="Nomo Pro py"
                    />
                    <div className={styles.cardLabel}>Nomo Py</div>
                    <p className={styles.cardDesc}>
                        Coding Python dengan editor lengkap
                    </p>
                </div>
            </div>
        </div>
    </div>
);

LandingPage.propTypes = {
    onSelectJuniorCode: PropTypes.func.isRequired,
    onSelectBlockCode: PropTypes.func.isRequired,
    onSelectPythonIDE: PropTypes.func.isRequired,
};

export default LandingPage;
