import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 1. 定義提示訊息的型別
interface Alert {
  show: boolean;
  message: string;
  type: 'error' | 'success';
}

const AuthPage = () => {
  const navigate = useNavigate();
  // 切換模式：'login' 或 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // 表單資料狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // 提示框狀態
  const [alert, setAlert] = useState<Alert>({
    show: false,
    message: '',
    type: 'error',
  });

  // 自動關閉提示框
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => setAlert({ ...alert, show: false }), 3000);
      return () => clearTimeout(timer);
    }
  });

  // 處理輸入變更 (TypeScript 會幫你檢查 e 的型別)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    // 前端簡易檢查
    if (!formData.email.includes('@')) {
      setAlert({ show: true, message: '請輸入有效的電子信箱', type: 'error' });
      return;
    }
    if (formData.password.length < 6) {
      setAlert({ show: true, message: '密碼長度需至少 6 位', type: 'error' });
      return;
    }

    // 模擬 API 呼叫
    const apiUrl = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    console.log(`正在發送請求至: ${apiUrl}`, formData);

    if (mode === 'login') {
      // 登入成功 -> 導向首頁
      navigate('/home');
    } else {
      // 註冊成功 -> 顯示綠色提示，不跳頁
      setAlert({
        show: true,
        message: '註冊成功！請切換至登入頁面',
        type: 'success',
      });
    }
  };

  return (
    <div style={containerStyle}>
      {/* 頂部滑落提示框 */}
      <div
        style={{
          ...alertStyle,
          transform: alert.show ? 'translateY(0)' : 'translateY(-100px)',
          backgroundColor: alert.type === 'error' ? '#e57373' : '#81c784',
        }}
      >
        {alert.message}
      </div>

      <div style={cardStyle}>
        <h2 style={{ color: '#2d5a5a' }}>
          {mode === 'login' ? '登入' : '加入 MintJourney'}
        </h2>

        {mode === 'register' && (
          <input
            name="name"
            placeholder="姓名"
            style={inputStyle}
            onChange={handleChange}
          />
        )}

        <input
          name="email"
          type="email"
          placeholder="信箱"
          style={inputStyle}
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="密碼"
          style={inputStyle}
          onChange={handleChange}
        />

        <button style={btnStyle} onClick={handleSubmit}>
          {mode === 'login' ? '登入' : '註冊'}
        </button>

        <p
          style={toggleLinkStyle}
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? '沒有帳號？立即註冊' : '已有帳號？返回登入'}
        </p>
      </div>
    </div>
  );
};

// 樣式設定
const containerStyle: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f4f0',
  overflow: 'hidden',
};

const alertStyle: React.CSSProperties = {
  position: 'fixed',
  top: '20px',
  left: '0',
  right: '0',
  margin: 'auto',
  width: '300px',
  padding: '15px',
  color: 'white',
  borderRadius: '8px',
  textAlign: 'center',
  transition: 'transform 0.5s ease',
  zIndex: 1000,
  fontWeight: 'bold',
};

const cardStyle: React.CSSProperties = {
  width: '320px',
  padding: '40px',
  backgroundColor: 'white',
  borderRadius: '20px',
  textAlign: 'center',
  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  marginBottom: '15px',
  borderRadius: '8px',
  border: '1px solid #e0e6e0',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: '#4a8c8c',
  color: 'white',
  border: 'none',
  borderRadius: '25px',
  cursor: 'pointer',
  marginTop: '10px',
};

const toggleLinkStyle: React.CSSProperties = {
  color: '#88a0a0',
  fontSize: '13px',
  marginTop: '20px',
  cursor: 'pointer',
  textDecoration: 'underline',
};

export default AuthPage;
