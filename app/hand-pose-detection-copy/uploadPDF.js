import React, { useState, useEffect, useRef } from 'react';
import { Worker, Viewer, SpecialZoomLevel, Icon, MinimalButton, Position, Tooltip } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin, RenderGoToPageProps } from '@react-pdf-viewer/page-navigation';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import { PDFDocument } from 'pdf-lib';
import { Rnd } from 'react-rnd';
import './index.css';
import styles from "../../styles/Home.module.css";
import disableScrollPlugin from './disableScrollPlugin';

import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function UploadPDF({ signatureDataURL }) {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const disableScrollPluginInstance = disableScrollPlugin();
    const pageNavigationPluginInstance = pageNavigationPlugin();
    const { GoToNextPage, GoToPreviousPage } = pageNavigationPluginInstance;

    const [pdfFile, setPdfFile] = useState(null);
    const [pdfFileArrayBuffer, setPdfFileArrayBuffer] = useState(null);
    const [pdfFileError, setPdfFileError] = useState('');
    const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
    const [signatureSize, setSignatureSize] = useState({ width: 200, height: 100 });
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const [numPages, setNumPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [viewerKey, setViewerKey] = useState(0);
    const allowedFiles = ['application/pdf'];
    const viewerRef = useRef(null);
    const containerRef = useRef(null);

    const handleFile = (e) => {
        let selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile && allowedFiles.includes(selectedFile.type)) {
                let reader = new FileReader();
                reader.readAsArrayBuffer(selectedFile);
                reader.onloadend = async () => {
                    setPdfFileError('');
                    setPdfFileArrayBuffer(reader.result);
                    const pdfDoc = await PDFDocument.load(reader.result);
                    setNumPages(pdfDoc.getPages().length);
                };
                let dataUrlReader = new FileReader();
                dataUrlReader.readAsDataURL(selectedFile);
                dataUrlReader.onloadend = () => {
                    setPdfFile(dataUrlReader.result);
                };
            } else {
                setPdfFileError('Please select a valid PDF file');
                setPdfFile(null);
                setPdfFileArrayBuffer(null);
            }
        } else {
            console.log('Select your file');
        }
    };

    const embedSignatureInPDF = async () => {
        if (!pdfFileArrayBuffer || !signatureDataURL) return;

        const pdfDoc = await PDFDocument.load(pdfFileArrayBuffer);
        const pages = pdfDoc.getPages();
        const selectedPage = pages[currentPage];
        const { width: pdfWidth, height: pdfHeight } = selectedPage.getSize();

        const signatureImage = await pdfDoc.embedPng(signatureDataURL);

        const { x, y } = signaturePosition;
        const { width: boxWidth, height: boxHeight } = signatureSize;

        const originalPdfWidth = selectedPage.getWidth();
        const originalPdfHeight = selectedPage.getHeight();

        const xScale = pdfWidth / originalPdfWidth;
        const yScale = pdfHeight / originalPdfHeight;

        let scaledX = x * xScale;
        let scaledY = pdfHeight - ((y + boxHeight) * yScale);

        const scaledWidth = boxWidth * xScale;
        const scaledHeight = boxHeight * yScale;

        // Calculate offsets based on the viewer container dimensions
        const containerWidth = containerRef.current ? containerRef.current.offsetWidth : pdfWidth;
        const containerHeight = containerRef.current ? containerRef.current.offsetHeight : pdfHeight;
        let offsetX, offsetY;
        console.log(window.innerWidth);
        if (window.innerWidth > 1700) {
            // Screens larger than 15 inches
            offsetX = scaledWidth * 0.68;
            offsetY = scaledHeight * 0.6;
        } else if (window.innerWidth > 1500) {
            // Screens 15 inches or smaller
            offsetX = scaledWidth * 0.42;
            offsetY = scaledHeight * 0.59;
        } else if (window.innerWidth > 1200) {
            // Screens between 15 and 12 inches
            offsetX = scaledWidth * 0.2;
            offsetY = scaledHeight * 0.35;
        }

        scaledX -= offsetX;
        scaledY += offsetY;

        selectedPage.drawImage(signatureImage, {
            x: scaledX,
            y: scaledY,
            width: scaledWidth * 0.75,
            height: scaledHeight * 0.75,
        });

        const pdfBytesSigned = await pdfDoc.save();
        const signedPdfBlob = new Blob([pdfBytesSigned], { type: 'application/pdf' });
        const signedPdfUrl = URL.createObjectURL(signedPdfBlob);

        const link = document.createElement('a');
        link.href = signedPdfUrl;
        link.download = 'signed.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDragStop = (e, d) => {
        setSignaturePosition({ x: d.x, y: d.y });
    };

    const handleResizeStop = (e, direction, ref, delta, position) => {
        setSignatureSize({
            width: ref.style.width.replace('px', ''),
            height: ref.style.height.replace('px', ''),
        });
        setSignaturePosition(position);
    };

    useEffect(() => {
        const checkPdfLoad = () => {
            const viewerElement = document.querySelector('.viewer .rpv-core__viewer canvas');
            if (viewerElement) {
                const rect = viewerElement.getBoundingClientRect();
                setPdfDimensions({ width: rect.width, height: rect.height });
                setIsPdfLoaded(true);
            }
        };

        const interval = setInterval(checkPdfLoad, 100);

        return () => clearInterval(interval);
    }, [pdfFile]);

    useEffect(() => {
        if (isPdfLoaded) {
            setSignaturePosition({ x: 0, y: 0 });
        }
    }, [currentPage, isPdfLoaded]);

    const handlePageChange = (e) => {
        const pageNumber = parseInt(e.target.value);
        setCurrentPage(pageNumber);
        setViewerKey(prevKey => prevKey + 1); // Force re-render
    };

    const goToPage = (pageIndex) => {
        setCurrentPage(pageIndex);
        setViewerKey(prevKey => prevKey + 1); // Force re-render
    };

    const goToNextPage = () => {
        if (currentPage < numPages - 1) {
            goToPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            goToPage(currentPage - 1);
        }
    };

    return (
        <div className={styles.pdfContainer} id="pdfContainer">
            <div style={{ marginLeft: '1rem' }}>
                <form>
                    <label><p style={{ fontWeight: 'bold' }}>Step 2: Upload PDF</p></label>
                    <br />
                    <input type='file' className="form-control" onChange={handleFile}></input>
                    {pdfFileError && <span className='text-danger'>{pdfFileError}</span>}
                </form>
                <button onClick={embedSignatureInPDF} disabled={!pdfFile || !signatureDataURL}>Sign PDF</button>
                <button onClick={() => setSignaturePosition({ x: 0, y: 0 })} style={{ marginLeft: '10px' }}>Clear Signature</button>
            </div>
            {numPages > 0 && (
                <div style={{ padding: '1rem' }}>
                    <label>Select Page:</label>
                    <select value={currentPage} onChange={handlePageChange}>
                        {Array.from({ length: numPages }, (_, index) => (
                            <option key={index} value={index}>Page {index + 1}</option>
                        ))}
                    </select>
                </div>
            )}

           
            <h5 style={{ marginLeft: '1rem' }}>View PDF</h5>
        <div className="viewer" ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
            {pdfFile && (
                <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js">
                    <Viewer
                        key={viewerKey}
                        fileUrl={pdfFile}
                        plugins={[defaultLayoutPluginInstance, disableScrollPluginInstance, pageNavigationPluginInstance]}
                        initialPage={currentPage}
                        defaultScale={SpecialZoomLevel.PageFit}  // Fit to page
                    />
                </Worker>
            )}
            {!pdfFile && <>No file is selected yet</>}

            {isPdfLoaded && pdfFile && signatureDataURL && (
                <Rnd
                    size={{ width: signatureSize.width * 0.75, height: signatureSize.height * 0.75 }}
                    position={{ x: signaturePosition.x, y: signaturePosition.y }}
                    onDragStart={() => {
                        document.body.classList.add('disable-selection');
                    }}
                    onDragStop={(e, d) => {
                        document.body.classList.remove('disable-selection');
                        setSignaturePosition({ x: d.x, y: d.y });
                    }}                    enableResizing={false}  // Disable resizing
                    bounds="parent"
                >
                    <div
                        style={{
                            border: '1px dashed black',
                            background: `url(${signatureDataURL}) no-repeat center center`,
                            backgroundSize: 'contain',
                            width: '100%',
                            height: '100%',
                        }}
                    />
                </Rnd>
            )}

            <div
                style={{
                    left: 0,
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(24px, -50%)',
                    zIndex: 1,
                }}
            >
                <MinimalButton onClick={goToPreviousPage}>
                    <Icon size={16}>
                        <path d="M18.4.5,5.825,11.626a.5.5,0,0,0,0,.748L18.4,23.5" />
                    </Icon>
                </MinimalButton>
            </div>

            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translate(-24px, -50%)',
                    zIndex: 1,
                }}
            >
                <MinimalButton onClick={goToNextPage}>
                    <Icon size={16}>
                        <path d="M5.651,23.5,18.227,12.374a.5.5,0,0,0,0-.748L5.651.5" />
                    </Icon>
                </MinimalButton>
            </div>
        </div>
    </div>
);
}