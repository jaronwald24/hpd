import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
    return (
        <div className={styles.container}>
            <Head>
                <title>ml-app</title>
                <meta name="description" content="ml-app" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main} style={{ justifyContent: "center" }}>
                <h1 className={styles.title}>
                    Welcome to Hand Gesture Detection!
                </h1>
                {/* <FpsCounter /> */}
                <div className={styles.grid}>
                    <Link href="/hand-pose-detection-copy" className={styles.card}>
                        <h2 className={styles.text}>⭐ PDF Hand-Gesture Signing ⭐</h2>
                        <p className={styles.text}>Sign your PDFs with the movement of your hand</p>
                    </Link>
                    <Link href="/hand-pose-detection" className={styles.card}>
                        <h2 className={styles.text}> Hand Detection</h2>
                        <p className={styles.text}>Hand pose detection by TensorFlow </p>
                    </Link>
                    <Link href="/face-landmark-detection" className={styles.card}>
                        <h2 className={styles.text}> Face Detection</h2>
                        <p className={styles.text}>Face detection by TensorFlow</p>
                    </Link>
                </div>
            </main>
        </div>
    );
}