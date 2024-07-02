import React, { useState, useRef, useEffect } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import { PDFDocument } from 'pdf-lib';
import { Rnd } from 'react-rnd';
import './index.css';

import * as pdfjs from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function UploadPDF({ signatureDataURL }) {
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const [pdfFile, setPdfFile] = useState(null);
    const [pdfFileArrayBuffer, setPdfFileArrayBuffer] = useState(null);
    const [pdfFileError, setPdfFileError] = useState('');
    const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
    const [signatureSize, setSignatureSize] = useState({ width: 200, height: 100 });
    const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
    const [isPdfLoaded, setIsPdfLoaded] = useState(false);
    const allowedFiles = ['application/pdf'];

    const handleFile = (e) => {
        let selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile && allowedFiles.includes(selectedFile.type)) {
                let reader = new FileReader();
                reader.readAsArrayBuffer(selectedFile);
                reader.onloadend = async () => {
                    setPdfFileError('');
                    setPdfFileArrayBuffer(reader.result);
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
    
        // Load the PDF where the signature will be placed
        const pdfDoc = await PDFDocument.load(pdfFileArrayBuffer);
        const firstPage = pdfDoc.getPages()[0];
        const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();
    
        const signatureImage = await pdfDoc.embedPng(signatureDataURL);
    
        const { x, y } = signaturePosition;
        const { width: boxWidth, height: boxHeight } = signatureSize;
    
        // Dimensions of the original PDF (replace with actual dimensions)
        const originalPdfWidth = firstPage.getWidth()
        const originalPdfHeight = firstPage.getHeight();

    
        // Calculate the scaling factors
        const xScale = pdfWidth / originalPdfWidth;
        const yScale = pdfHeight / originalPdfHeight;
    
        // Transform and scale the coordinates from the original PDF to the new PDF
        let scaledX = x * xScale;
        let scaledY = pdfHeight - ((y + boxHeight) * yScale); // Adjust Y to account for the PDF coordinate system
    
        // Scale the width and height of the signature
        const scaledWidth = boxWidth * xScale;
        const scaledHeight = boxHeight * yScale;
    
        // Adjust for slight offset down and to the right
        const offsetX = scaledWidth * 0.02; // 2% of the width as offset correction
        const offsetY = scaledHeight * 0.02; // 2% of the height as offset correction
    
        scaledX -= offsetX;
        scaledY += offsetY;
    
        // Logging for debugging
        console.log(`Dragging... x: ${x}, y: ${y}`);
        console.log(`Canvas position: x: ${x}, y: ${y}`);
        console.log(`Canvas size: width: ${boxWidth}, height: ${boxHeight}`);
        console.log(`PDF position: x: ${scaledX}, y: ${scaledY}`);
        console.log(`PDF dimensions: width: ${pdfWidth}, height: ${pdfHeight}`);
        console.log(`Scaling factors: xScale: ${xScale}, yScale: ${yScale}`);
        console.log(`Offsets: offsetX: ${offsetX}, offsetY: ${offsetY}`);
    
        // Draw the signature image on the new PDF using advanced drawImage
        firstPage.drawImage(signatureImage, {
            x: scaledX,
            y: scaledY,
            width: scaledWidth,
            height: scaledHeight,
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
        console.log(`Dragging... x: ${d.x}, y: ${d.y}`);
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
                console.log('width: ', rect.width, 'height: ', rect.height)
                setIsPdfLoaded(true);
            }
        };

        const interval = setInterval(checkPdfLoad, 100);

        return () => clearInterval(interval);
    }, [pdfFile]);

    return (
        <div className="container" style={{ zIndex: 25, width: window.innerWidth * 0.5 }}>
            <form>
                <label><h5>Upload PDF</h5></label>
                <br />
                <input type='file' className="form-control" onChange={handleFile}></input>
                {pdfFileError && <span className='text-danger'>{pdfFileError}</span>}
            </form>
            <button onClick={embedSignatureInPDF} disabled={!pdfFile || !signatureDataURL}>Sign PDF</button>
            <button onClick={() => setSignaturePosition({ x: 0, y: 0 })} style={{ marginLeft: '10px' }}>Clear Signature</button>

            <h5>View PDF</h5>
            <div className="viewer" style={{ position: 'relative' }}>
                {pdfFile && (
                    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js">
                        <Viewer fileUrl={pdfFile} plugins={[defaultLayoutPluginInstance]}></Viewer>
                    </Worker>
                )}
                {!pdfFile && <>No file is selected yet</>}

                {isPdfLoaded && pdfFile && signatureDataURL && (
                    <Rnd
                        size={{ width: signatureSize.width, height: signatureSize.height }}
                        position={{ x: signaturePosition.x, y: signaturePosition.y }}
                        onDragStop={handleDragStop}
                        onResizeStop={handleResizeStop}
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
            </div>
        </div>
    );
}
