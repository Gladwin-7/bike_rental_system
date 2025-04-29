import React, { useState, useEffect } from "react";
import CustomerDashboard from "./CustomerDashboard";
import AdminDashboard from "./AdminDashboard";
import Modal from "./components/Modal"; // Import Modal
import "./App.css";

function App() {
  const [page, setPage] = useState("login");
  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    userType: "customer",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    password: "",
    userType: "customer",
  });

  const [loading, setLoading] = useState(false);
  const [modalContent, setModalContent] = useState(null); // For showing modal

  useEffect(() => {
    const storedUserType = localStorage.getItem("userType");
    if (storedUserType) {
      setPage(storedUserType === "admin" ? "admin" : "customer");
    }
  }, []);

  const showModal = (message, nextAction = null) => {
    setModalContent({
      title: "Confirmation",
      message,
      onClose: () => {
        setModalContent(null);
        if (nextAction) nextAction();
      },
    });
  };

  const login = async () => {
    if (!loginData.identifier || !loginData.password) {
      showModal("Please enter both Email ID and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Login failed");

      localStorage.setItem("userType", data.userType);
      if (data.userType === "customer") {
        localStorage.setItem("customerId", data.customerId);
      }

      showModal(data.message, () => setPage(data.userType));
    } catch (error) {
      showModal(error.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    const { name, email, mobile, address, password } = registerData;
    if (!name || !email || !mobile || !address || !password) {
      showModal("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Registration failed");

      showModal(data.message, () => setPage("login"));
    } catch (error) {
      showModal(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={page === "login" || page === "register" ? "login-container" : "container"}>
      {modalContent && (
        <Modal title={modalContent.title} onClose={modalContent.onClose}>
          <p>{modalContent.message}</p>
          <button onClick={modalContent.onClose} style={{ marginTop: "10px" }}>
            OK
          </button>
        </Modal>
      )}

      {page === "login" && (
        <div className="login-box">
          <h1>Login</h1>
          <div className="login-field">
            <label className="input-label">Email ID</label>
            <input
              type="text"
              placeholder="Enter Email ID"
              value={loginData.identifier}
              onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="Enter Password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label>
              <input
                type="radio"
                value="customer"
                checked={loginData.userType === "customer"}
                onChange={() => setLoginData({ ...loginData, userType: "customer" })}
              />{" "}
              Customer
            </label>
            <label>
              <input
                type="radio"
                value="admin"
                checked={loginData.userType === "admin"}
                onChange={() => setLoginData({ ...loginData, userType: "admin" })}
              />{" "}
              Admin
            </label>
          </div>
          <button onClick={login} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          <p style={{ marginTop: "10px", textAlign: "center" }}>
            Don't have an account?{" "}
            <span style={{ color: "#3b82f6", cursor: "pointer" }} onClick={() => setPage("register")}>
              Register here
            </span>
          </p>
        </div>
      )}

      {page === "register" && (
        <div className="login-box">
          <h1>Register</h1>
          <div className="login-field">
            <label className="input-label">Name</label>
            <input
              type="text"
              value={registerData.name}
              onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label className="input-label">Mobile</label>
            <input
              type="text"
              value={registerData.mobile}
              onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label className="input-label">Email</label>
            <input
              type="text"
              value={registerData.email}
              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label className="input-label">Address</label>
            <input
              type="text"
              value={registerData.address}
              onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
            />
          </div>
          <div className="login-field">
            <label className="input-label">Password</label>
            <input
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
            />
          </div>
          <button onClick={register} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
          <p style={{ marginTop: "10px", textAlign: "center" }}>
            Already have an account?{" "}
            <span style={{ color: "#3b82f6", cursor: "pointer" }} onClick={() => setPage("login")}>
              Login here
            </span>
          </p>
        </div>
      )}

      {page === "customer" && <CustomerDashboard setPage={setPage} />}
      {page === "admin" && <AdminDashboard setPage={setPage} />}
    </div>
  );
}

export default App;
