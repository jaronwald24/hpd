"use client";
import styles from "../../styles/Home.module.css";
import { useEffect, useRef, useState } from 'react';
import { createDetector, SupportedModels } from "@tensorflow-models/hand-pose-detection";
import '@tensorflow/tfjs-backend-webgl';
import { drawHands } from "../../lib/utils";
import Link from "next/link";
import { useAnimationFrame } from "../../lib/hooks/useAnimationFrame";
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';

tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm`);

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

async function setupCanvas(video) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    return ctx;
}

export default function HandPoseDetection() {
    const detectorRef = useRef();
    const videoRef = useRef();
    const [ctx, setCtx] = useState();

    useEffect(() => {
        async function initialize() {
            videoRef.current = await setupVideo();
            videoRef.current.style.display = "none";
            const ctx = await setupCanvas(videoRef.current);
            detectorRef.current = await setupDetector();

            setCtx(ctx);
        }

        initialize();
        window.addEventListener('resize', async () => {
            const canvas = document.getElementById('canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }, []);



    useAnimationFrame(async delta => {
        if (!detectorRef.current || !videoRef.current || !ctx){
            return;
        }
        const hands = await detectorRef.current.estimateHands(
            video,
            {
                flipHorizontal: false
            }
        );

        ctx.clearRect(0, 0, videoRef.current.videoWidth, videoRef.current.videoHeight);
        if (hands.length > 0) {
            drawHands(hands, ctx);
        }
    });
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
                <code style={{ marginBottom: '1rem' }}>Work in progress...</code>
                <div className={styles.canvas}>
                    <canvas
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            transform: "scaleX(-1)",
                            zIndex: 10,
                            backgroundColor: "grey",
                        }}
                        id="canvas">
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
