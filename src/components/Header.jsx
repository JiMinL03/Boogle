import styles from './Header.module.css'

const LETTERS = [
  { char: 'B', color: '#FF6B00' },
  { char: 'o', color: '#4A90D9' },
  { char: 'o', color: '#00BFA5' },
  { char: 'g', color: '#F5A623' },
  { char: 'l', color: '#9B6DFF' },
  { char: 'e', color: '#F06292' },
]

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        {LETTERS.map(({ char, color }, i) => (
          <span key={i} style={{ color }}>{char}</span>
        ))}
      </div>
      <div className={styles.divider} />
      <span className={styles.sub}>3D Maritime Route Explorer</span>
    </header>
  )
}
