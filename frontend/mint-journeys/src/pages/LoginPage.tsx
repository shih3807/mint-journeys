import colors from '../styles/color';
import titleImage from '../assets/title.webp';

const styles = {
  container: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
    gap: '24px',
  },
  title: {
    width: 'calc(100% - 20px)',
    maxWidth: '400px',
    marginBottom: '10px',
  },
  loginBtn: {
    padding: '12px 40px',
    backgroundColor: colors.primary.main,
    width:'300px',
    color: colors.backgrand,
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '15px',
  },
  registerLink: {
    color: colors.accent.black,
    fontSize: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};

export default function LoginPage() {
  // 這裡可以加入邏輯，例如點擊後的動作
  const handleLogin = () => {
    alert('正在進入你的旅行帳本...');
  };

  return (
    <div style={styles.container}>
      <img src={titleImage} style={styles.title}></img>

      <button style={styles.loginBtn} onClick={handleLogin}>
        登入
      </button>

      <button style={styles.registerLink} onClick={() => alert('前往註冊頁面')}>
        還沒有帳號？立即註冊
      </button>
    </div>
  );
}
