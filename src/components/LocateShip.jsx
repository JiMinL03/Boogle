import styles from './LocateShip.module.css'

export default function LocateShip({ locateRef }) {
  return (
    <button
      className={styles.btn}
      onClick={() => locateRef.current?.()}
      title="선박 위치로 이동"
    >
      <span className={styles.icon}>⚓</span>
      <span className={styles.label}>선박 찾기</span>
    </button>
  )
}
