"use client";
import styles from "../../styles/Home.module.css";

import { useState } from 'react';
import HandPoseDetection from './helper';
import UploadPDF from './uploadPDF';

export default function MainComponent() {
    const [signatureDataURL, setSignatureDataURL] = useState('');

    const handleSaveSignature = (dataURL) => {
        setSignatureDataURL(dataURL);
    };

    const handleResetSignature = () => {
        setSignatureDataURL('');
    }


    return (
        <div className={styles.totalContainer}>
            <HandPoseDetection signatureUrl={signatureDataURL} onSaveSignature={handleSaveSignature} onResetSignature={handleResetSignature} />
            <div className={styles.container}>
                <UploadPDF signatureDataURL={signatureDataURL} />
            </div>
        </div>
    );
}