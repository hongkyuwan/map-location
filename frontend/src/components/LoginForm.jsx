import { useState } from "react";
import { api, setToken } from "../api/client";

export default function LoginForm({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await api.login(password);
      setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>📍 주소 지도 표시기</h1>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button type="submit" disabled={loading || !password}>
          {loading ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
