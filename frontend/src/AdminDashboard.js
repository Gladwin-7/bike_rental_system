import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import Modal from "./components/Modal";
          // adjust import path if different

function AdminDashboard({ setPage }) {
  /* ─── State ─────────────────────────────────────────── */
  const [bikes, setBikes]       = useState([]);
  const [rentedBikes, setRent]  = useState([]);
  const [showRent, setShowRent] = useState(false);
  const [loading, setLoading]   = useState(true);

  const [newBike, setNewBike]   = useState({
    registration_number: "",
    model: "",
    type: "",
    price_per_hour: "",
  });

  const [modal, setModal] = useState({
    open: false,
    msg: "",
    mode: "info",      // "info" | "confirm"
    onYes: null,
  });

  /* ─── Helpers ───────────────────────────────────────── */
  const info   = msg         => setModal({ open: true, msg, mode: "info",    onYes: null });
  const confirm= (msg, fn)   => setModal({ open: true, msg, mode: "confirm", onYes: fn   });
  const close  = ()          => setModal(m => ({ ...m, open: false }));

  /* ─── Fetch available bikes ─────────────────────────── */
  useEffect(() => {
    fetch("http://localhost:5000/get-bikes?userType=admin")
      .then(r => r.json())
      .then(data => { setBikes(data); setLoading(false); })
      .catch(err => console.error("Fetch bikes:", err));
  }, []);

  /* ─── Fetch rented bikes ────────────────────────────── */
  const loadRented = () =>
    fetch("http://localhost:5000/rented-bikes")
      .then(r => r.json())
      .then(setRent)
      .catch(err => console.error("Fetch rented:", err));

  /* ─── Add bike ──────────────────────────────────────── */
  const addBike = () => {
    const { registration_number, model, type, price_per_hour } = newBike;
    if (!registration_number || !model || !type || !price_per_hour)
      return alert("All fields required");

    confirm("Add this bike?", () => {
      fetch("http://localhost:5000/add-bike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBike),
      })
        .then(r => r.json())
        .then(res => {
          info(res.message || "Bike added");
          if (res.success) {
            setBikes(b => [...b, { ...newBike, bike_id: res.bikeId || Date.now(), status: "Available" }]);
            setNewBike({ registration_number:"", model:"", type:"", price_per_hour:"" });
          }
        })
        .catch(err => console.error("Add bike:", err));
    });
  };

  /* ─── Delete bike ───────────────────────────────────── */
  const delBike = id => {
    confirm("Delete this bike?", () => {
      fetch(`http://localhost:5000/delete-bike/${id}`, { method: "DELETE" })
        .then(r => r.json())
        .then(res => {
          info(res.message || "Bike deleted");
          if (res.success) setBikes(b => b.filter(x => x.bike_id !== id));
        })
        .catch(err => console.error("Del bike:", err));
    });
  };

  /* ─── Render ────────────────────────────────────────── */
  return (
    <div className="dashboard">
      {/* Modal */}
      {modal.open && (
        <Modal title={modal.mode === "confirm" ? "Confirm Action" : "Message"} onClose={close}>
          <p>{modal.msg}</p>
          {modal.mode === "confirm" && (
            <div className="btn-row">
              <button className="btn yes" onClick={() => { modal.onYes(); close(); }}>Yes</button>
              <button className="btn no"  onClick={close}>No</button>
            </div>
          )}
        </Modal>
      )}

      {/* Header */}
      <header className="flex-between">
        <h1>Admin Dashboard</h1>
        <button className="btn logout" onClick={() => { localStorage.clear(); setPage("login"); }}>
          Logout
        </button>
      </header>

      {/* Add Bike */}
      <section className="card">
        <h2>Add New Bike</h2>
        <div className="grid-form">
          <input placeholder="Registration No."
                 value={newBike.registration_number}
                 onChange={e => setNewBike({ ...newBike, registration_number: e.target.value })} />
          <input placeholder="Model"
                 value={newBike.model}
                 onChange={e => setNewBike({ ...newBike, model: e.target.value })} />
          <select value={newBike.type} onChange={e => setNewBike({ ...newBike, type: e.target.value })}>
            <option value="">Type</option>
            <option>Standard</option><option>Electric</option>
            <option>Scooter</option><option>MTB</option><option>Road</option>
          </select>
          <input type="number" min="1" placeholder="₹ per hour"
                 value={newBike.price_per_hour}
                 onChange={e => setNewBike({ ...newBike, price_per_hour: e.target.value })} />
        </div>
        <div className="flex-end">
          <button className="btn primary" onClick={addBike}>Add Bike</button>
        </div>
      </section>

      {/* Available */}
      <section className="card">
        <h2>Available Bikes</h2>
        {loading ? (<p>Loading…</p>) :
         bikes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Reg.No</th><th>Model</th><th>Type</th><th>₹/hr</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {bikes.map(b => (
                  <tr key={b.bike_id}>
                    <td>{b.bike_id}</td><td>{b.registration_number}</td><td>{b.model}</td>
                    <td>{b.type}</td><td>{b.price_per_hour}</td><td>{b.status}</td>
                    <td><button className="btn danger sm" onClick={() => delBike(b.bike_id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (<p>No bikes available.</p>)}
      </section>

      {/* Rented */}
      <section className="card">
        <div className="flex-between">
          <h2>Rented Bikes</h2>
          <button className="btn secondary" onClick={() => { loadRented(); setShowRent(!showRent); }}>
            {showRent ? "Hide" : "View"}
          </button>
        </div>

        {showRent && (
          rentedBikes.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Reg.No</th><th>Customer</th><th>Model</th><th>Type</th>
                    <th>Start</th><th>End</th><th>Total ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {rentedBikes.map(r => (
                    <tr key={r.rental_id}>
                      <td>{r.rental_id}</td><td>{r.registration_number}</td><td>{r.customer_name}</td>
                      <td>{r.model}</td><td>{r.type}</td>
                      <td>{r.start_date}</td><td>{r.end_date}</td><td>{r.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (<p>No active rentals.</p>)
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
