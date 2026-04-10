import styles from './AnimatedLogo.module.css'
import ciLogo from '../assets/ci_concept.png'

export default function AnimatedLogo() {
  return (
    <div className={styles.wrapper}>

      {/* CI 로고 이미지 */}
      <div className={styles.logoWrap}>
        <img src={ciLogo} alt="Hanwha Ocean CI" className={styles.logoImg} />
        {/* 글로우 레이어 */}
        <img src={ciLogo} alt="" className={styles.logoGlow} aria-hidden="true" />
      </div>

      {/* 텍스트 로고 */}
      <div className={styles.textLogo}>
        <div className={styles.lineWrap}>
          <span className={`${styles.textLine} ${styles.line1}`}>Ocean DX</span>
        </div>
        <div className={styles.lineWrap}>
          <span className={`${styles.textLine} ${styles.line2}`}>Academy</span>
        </div>
        <div className={styles.lineWrap}>
          <span className={`${styles.subLine} ${styles.line3}`}>한화오션엔지니어링</span>
        </div>
      </div>

    </div>
  )
}
