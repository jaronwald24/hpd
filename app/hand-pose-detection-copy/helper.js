"use client";
import styles from "../../styles/Home.module.css";
import { useEffect, useRef, useState } from 'react';
import { createDetector, SupportedModels } from "@tensorflow-models/hand-pose-detection";
import '@tensorflow/tfjs-backend-webgl';
import { drawHands } from "../../lib/utils";
import Link from "next/link";
import { useAnimationFrame } from "../../lib/hooks/useAnimationFrame";
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';


class Point {
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}

tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm`);



// all functionality releated to drawing
var drawing = false;
var erasing = false; 
var prev_coords = null;





function calculateDistance(p1, p2){
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function drawLine(ctx, moveTo, lineTo, color, lineWidth = 5) {
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.moveTo(moveTo.x, moveTo.y);
    ctx.lineTo(lineTo.x, lineTo.y);
    ctx.stroke();
}

function drawCustomHands(hands, ctx) {
    const landmarkColor = 'red';
    const connectionColor = 'black';
    const lineWidth = 2;
    hands.forEach(hand => {
        // Draw landmarks
        hand.keypoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = landmarkColor;
            ctx.fill();
        });

        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [5, 6], [6, 7], [7, 8],         // Index finger
            [9, 10], [10, 11], [11, 12],    // Middle finger
            [13, 14], [14, 15], [15, 16],   // Ring finger
            [17, 18], [18, 19], [19, 20],   // Pinky
            [0, 5], [5, 9], [9, 13], [13, 17], [17, 0] // Palm
        ];
        ctx.strokeStyle = connectionColor;
        ctx.lineWidth = lineWidth;
        connections.forEach(pair => {
            ctx.beginPath();
            ctx.moveTo(hand.keypoints[pair[0]].x, hand.keypoints[pair[0]].y);
            ctx.lineTo(hand.keypoints[pair[1]].x, hand.keypoints[pair[1]].y);
            ctx.stroke();
        });
    });
}

// Helper function to add text
function drawText(ctx, text, x, y, color = "black", font = "20px Arial") {
    ctx.save(); // Save the current state
    ctx.translate(ctx.width, 0)
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, x, y);
    ctx.restore(); // Restore the previous state
}


// all functionality releated to hand pose detection
async function setupVideo() {
    const video = document.getElementById('video');
    const stream = await window.navigator.mediaDevices.getUserMedia({ video: true });
    
    video.srcObject = stream;
    await new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve();
        }
    });
    video.play();

    video.width = window.innerWidth;
    video.height = window.innerHeight;

    return video;
}

async function setupDetector() {
    const model = SupportedModels.MediaPipeHands;
    const detector = await createDetector(
        model,
        {
            runtime: "mediapipe",
            maxHands: 2,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
        }
    );
    return detector;
}

async function setupCanvas(id) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');

    if (canvas == sigCanvas) {
        const modal = document.getElementById('sigModal');
        canvas.width = modal.clientWidth;
        canvas.height = modal.clientHeight;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;    
    }
    return ctx;
}

async function resetSigCanvas() {
    const sigCanvas = document.getElementById('sigCanvas');
    const sigCtx = sigCanvas.getContext('2d');

    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
}


async function setupModal() {
    var modal = document.getElementById("sigModal");
    var modalBtn = document.getElementById("modalBtn");

    var span = document.getElementsByClassName("close")[0];

    var sigCanvas = document.getElementById("sigCanvas");

    modalBtn.onclick = function() {
        modal.style.display = "block";
        span.style.zIndex = 50;
        document.getElementById("modalContent").style.zIndex = 30;
        document.getElementById("sigCanvas").style.zIndex = 35; // Bring sigCanvas to the top
        document.getElementById("landmarkCanvas").style.zIndex = 0; // Ensure landmarks are above sigCanvas
        document.querySelectorAll('.modal button').forEach(button => button.style.zIndex = 45);
        document.getElementById("sigCanvas").style.pointerEvents = "auto"; // Enable pointer events for sigCanvas
    }

    span.onclick = function() {
        modal.style.display = "none";
        document.getElementById("sigCanvas").style.zIndex = 15; // Reset sigCanvas zIndex
        document.getElementById("landmarkCanvas").style.zIndex = 20; 
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("sigCanvas").style.zIndex = 15; // Reset sigCanvas zIndex
            document.getElementById("landmarkCanvas").style.zIndex = 20;
        }
    }
}

export default function HandPoseDetection({onSaveSignature, onResetSignature }) {
    const detectorRef = useRef();
    const videoRef = useRef();
    const [landmarkCtx, setLandmarkCtx] = useState(null);
    const [sigCtx, setSigCtx] = useState(null);

    const [signatureDataURL, setSignatureDataURL] = useState(''); 

    const [color, setColor] = useState('black');


    const saveSignature = () => {
        const sigCanvas = document.getElementById('sigCanvas');
        const dataURL = sigCanvas.toDataURL('image/png');
        onSaveSignature(dataURL); // Pass the data URL to the parent component

        setSignatureDataURL(dataURL); 

        const modal = document.getElementById('sigModal');
        modal.style.display = "none";
    };

    const resetSignature = () => {
        onResetSignature();
        resetSigCanvas();
        setSignatureDataURL('');
    };

    const changeColor = (newColor) => {
        setColor(newColor);
        console.log("Color changed to:", newColor);
    };


    useEffect(() => {
        async function initialize() {
            videoRef.current = await setupVideo();
            videoRef.current.style.display = "none";
            const landmarkCtx = await setupCanvas("landmarkCanvas");
            const sigCtx = await setupCanvas("sigCanvas")
            
            detectorRef.current = await setupDetector();
            
            setLandmarkCtx(landmarkCtx);
            setSigCtx(sigCtx);
        }
        initialize();
        setupModal();

        const modalBtn = document.getElementById("modalBtn");
        modalBtn.addEventListener("click", () => {
            const modal = document.getElementById("sigModal");
            modal.style.display = "block";
            document.querySelector(".close").style.zIndex = 50;
            document.getElementById("sigCanvas").style.zIndex = 35; // Bring sigCanvas to the top
            document.getElementById("landmarkCanvas").style.zIndex = 30; // Ensure landmarks are above sigCanvas
            document.querySelectorAll('.modal button').forEach(button => button.style.zIndex = 45);
            document.getElementById("landmarkCanvas").style.pointerEvents = "none"; // Disable pointer events for landmarkCanvas
            document.getElementById("sigCanvas").style.pointerEvents = "auto"; // Enable pointer events for sigCanvas
        });
    

        window.addEventListener('resize', async () => {
            const landmarkCanvas = document.getElementById('landmarkCanvas');
            const sigCanvas = document.getElementById('sigCanvas');
            if (landmarkCanvas) {
                landmarkCanvas.width = window.innerWidth;
                landmarkCanvas.height = window.innerHeight;
            }
            if (sigCanvas) {
                const modal = document.getElementById('sigModal');
                sigCanvas.width = modal.clientWidth;
                sigCanvas.height = modal.clientHeight;
            }
        });
    }, []);
    
    useAnimationFrame(async () => {
        const hands = await detectorRef.current.estimateHands(
            videoRef.current,
            { flipHorizontal: true }
        );
    
        landmarkCtx.clearRect(0, 0, landmarkCtx.canvas.width, landmarkCtx.canvas.height);
        if (hands.length > 0) {
            hands.forEach(hand => {
                hand.keypoints.forEach(point => {
                    point.x = (point.x / videoRef.current.videoWidth) * landmarkCtx.canvas.width;
                    point.y = (point.y / videoRef.current.videoHeight) * landmarkCtx.canvas.height;
                });
            });
            drawCustomHands(hands, landmarkCtx);
    
            hands.forEach(hand => {
                if (hand.handedness === 'Right') {
                    const indexFingerTip = hand.keypoints[8];
                    const thumbTip = hand.keypoints[4];
    
                    const indexFingerCoords = new Point(indexFingerTip.x, indexFingerTip.y);
                    const thumbCoords = new Point(thumbTip.x, thumbTip.y);
    
                    const distance = calculateDistance(indexFingerCoords, thumbCoords);
    
                    if (distance > 160) {
                        drawText(landmarkCtx, "Ready to Draw", indexFingerCoords.x, indexFingerCoords.y - 20);
    
                        if (!drawing) {
                            drawing = true;
                            prev_coords = indexFingerCoords;
                        } else {
                            console.log(color); // Verify the color used for drawing
                            drawLine(sigCtx, prev_coords, indexFingerCoords, color); // Use color state here
                            prev_coords = indexFingerCoords;
                        }
                        erasing = false;
                    } else {
                        drawing = false;
                        prev_coords = null;
                    }
                }
            });
        }
    }, !!(detectorRef.current && videoRef.current && landmarkCtx && sigCtx));

//copy
    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h2
                    style={{
                        fontWeight: "normal",
                        zIndex: 50,
                    }}>
                    <Link style={{ fontWeight: "bold" }} href={'/'}>Home</Link> / Draw Your Signature!
                </h2>
                <code style={{ marginBottom: '1rem', fontSize: 16 }}>I recommend keeping the browser as Square as possible.</code>
                <code style={{ marginBottom: '1rem', fontSize: 16 }}>Also, the closer to the boundaries of your camera you get, the shakier it will be.</code>
                <button style={{zIndex: 25, width: '12%', height: '6%', marginBottom: '3%' }} type="button" onClick={() => {
                    resetSignature();
                    }}>Reset Signature</button>
                <button id="modalBtn" style={{zIndex: 25, width: '15%', height: '6%', marginBottom: '3%'}}>Draw Signature</button>
                {signatureDataURL && 
                <div className={styles.signatureContainer}>
                    <h2 style={{marginBottom: '1rem'}}>Your Signature:</h2>
                    <img style={{height: '35%', width: '55%', marginTop: '3%'}}src={signatureDataURL} alt="signature" />
                </div>}
                <div style={{flex: 1}}>
                    <div id="sigModal" className={styles.modal} style={{zIndex: 30}}>
                    <div id="modalContent" className={styles.modalContent}>
                        <div className={styles.modalBody}>
                            <canvas
                                style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: "transparent",
                                    zIndex: 15,
                                }}
                                id="sigCanvas">
                            </canvas>
                            <div className={styles.modalButtons}>
                                <span style={{marginRight: 30}} className="close">&times;</span>
                                <button id="clearBtn" onClick={resetSigCanvas}>Clear</button>
                                <button id="saveBtn" onClick={saveSignature}>Save</button>
                                <div className={styles.colorButtons}> 
                                    <button onClick={() => changeColor('black')} style={{backgroundColor: 'black', height: '70%', width: '10%'}}></button>
                                    <button onClick={() => changeColor('red')} style={{backgroundColor: 'red', height: '70%', width: '10%'}}></button>
                                    <button onClick={() => changeColor('blue')} style={{backgroundColor: 'blue', height: '70%', width: '10%'}}></button>
                                    <button onClick={() => changeColor('green')} style={{backgroundColor: 'green', height: '70%', width: '10%'}}></button>
                                    <button onClick={() => changeColor('yellow')} style={{backgroundColor: 'yellow', height: '70%', width: '10%'}}></button>
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                <div className={styles.canvas}>
                    <canvas
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 10,
                            backgroundColor: "transparent",
                        }}
                        id="landmarkCanvas">
                    </canvas>
                    <canvas
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 15,
                            backgroundColor: "transparent",
                        }}
                        id="sigCanvas">
                    </canvas>
                    <video
                        style={{
                            display: "none",
                            transform: "scaleX(-1)",
                            width: '100%',
                            height: '100%',
                        }}
                        id="video"
                        playsInline>
                    </video>
                </div>
            </main>
        </div>
    )
}
