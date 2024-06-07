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

function drawLine(ctx, moveTo, lineTo, color = "blue", lineWidth = 5) {
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

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    return ctx;
}

export default function HandPoseDetection() {
    const detectorRef = useRef();
    const videoRef = useRef();
    const [landmarkCtx, setLandmarkCtx] = useState(null);
    const [drawingCtx, setDrawingCtx] = useState(null);

    useEffect(() => {
        async function initialize() {
            videoRef.current = await setupVideo();
            videoRef.current.style.display = "none";
            const landmarkCtx = await setupCanvas("landmarkCanvas");
            const drawingCtx = await setupCanvas("drawingCanvas");
            
            detectorRef.current = await setupDetector();

            setLandmarkCtx(landmarkCtx);
            setDrawingCtx(drawingCtx);
        }
        initialize();
        window.addEventListener('resize', async () => {
            const landmarkCanvas = document.getElementById('landmarkCanvas');
            const drawingCanvas = document.getElementById('drawingCanvas');
            if (landmarkCanvas) {
                landmarkCanvas.width = window.innerWidth;
                landmarkCanvas.height = window.innerHeight;
            }
            if (drawingCanvas) {
                drawingCanvas.width = window.innerWidth;
                drawingCanvas.height = window.innerHeight;
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
                            drawLine(drawingCtx, prev_coords, indexFingerCoords);
                            prev_coords = indexFingerCoords;
                        }
                        erasing = false;
                    } else {
                        drawing = false;
                        prev_coords = null;
                    }
                } else if (hand.handedness === 'Left') {
                    const indexFingerTip = hand.keypoints[8];
                    const thumbTip = hand.keypoints[4];

                    const indexFingerCoords = new Point(indexFingerTip.x, indexFingerTip.y);
                    const thumbCoords = new Point(thumbTip.x, thumbTip.y);

                    const distance = calculateDistance(indexFingerCoords, thumbCoords);

                    if (distance > 160) {
                        drawText(landmarkCtx, "Ready to Erase", indexFingerCoords.x, indexFingerCoords.y - 20);

                        if (!erasing) {
                            erasing = true;
                            prev_coords = indexFingerCoords;
                        } else {
                            drawLine(drawingCtx, prev_coords, indexFingerCoords, "white", 150);
                            prev_coords = indexFingerCoords;
                        }
                        drawing = false;
                    } else {
                        erasing = false;
                        prev_coords = null;
                    }
                } else {
                    drawing = false;
                    erasing = false;
                    prev_coords = null;
                }
            });
        }
    }, !!(detectorRef.current && videoRef.current && landmarkCtx && drawingCtx));

//copy
    return (
        <div className={styles.container}>
            <main className={styles.main}>
                <h2
                    style={{
                        fontWeight: "normal"
                    }}>
                    <Link style={{ fontWeight: "bold" }} href={'/'}>Home</Link> / Hand Pose Detection Copy👋
                </h2>
                <code style={{ marginBottom: '1rem' }}>I recommend keeping the browser as Square as possible</code>
                <div className={styles.canvas}>
                    <canvas
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: 9,
                            backgroundColor: "transparent",
                        }}
                        id="drawingCanvas">
                    </canvas>
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
