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
                    Welcome to Hand Tracker! 👋
                </h1>
                {/* <FpsCounter /> */}
                <div className={styles.grid}>
                    <Link href="/hand-pose-detection" className={styles.card}>
                        <h2> Hand Detection &rarr;</h2>
                        <p>Hand pose detection by TensorFlow 👋</p>
                    </Link>
                    <Link href="/hand-pose-detection-copy" className={styles.card}>
                        <h2> Hand Detection Copy&rarr;</h2>
                        <p>Hand pose detection by TensorFlow 👋</p>
                    </Link>
                    <Link href="/face-landmark-detection" className={styles.card}>
                        <h2> Face Detection &rarr;</h2>
                        <p>Face detection by TensorFlow</p>
                    </Link>
                </div>
            </main>
        </div>
    );
}