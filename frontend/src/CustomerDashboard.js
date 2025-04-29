import React, { useState, useEffect, useCallback } from "react";
import "./CustomerDashboard.css";
import Modal from "./components/Modal"; // adjust if path differs

function CustomerDashboard({ setPage }) {
  /* ── state ─────────────────────────────────────────── */
  const [bikes, setBikes] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoad] = useState({ bikes: true, rentals: false, action: false });
  const [error, setError] = useState("");

  /* ui state */
  const [tab, setTab] = useState("available");
  const [filter, setFilter] = useState("");

  /* modal state */
  const [dateDlg, setDateDlg] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(null); // success modal

  const [act, setAct] = useState({ kind: "", rentId: "", bikeId: "", hours: "" });

  const customerId = localStorage.getItem("customerId");

  /* ── fetch bikes ───────────────────────────────────── */
  const loadBikes = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:5000/get-bikes");
      const data = await res.json();
      setBikes(data);
    } catch {
      setError("Unable to load bikes");
    } finally {
      setLoad((l) => ({ ...l, bikes: false }));
    }
  }, []);

  /* ── fetch my rentals ──────────────────────────────── */
  const loadRentals = useCallback(async () => {
    setLoad((l) => ({ ...l, rentals: true }));
    try {
      const res = await fetch(`http://localhost:5000/customer-rentals/${customerId}`);
      const data = await res.json();
      setRentals(data);
    } catch {
      setError("Unable to load rentals");
    } finally {
      setLoad((l) => ({ ...l, rentals: false }));
    }
  }, [customerId]);

  useEffect(() => { loadBikes(); }, [loadBikes]);

  /* ── helpers ───────────────────────────────────────── */
  const openRent = bikeId => { setAct({ kind: "rent", bikeId, hours: "" }); setDateDlg(true); };
  const openRet = (rentId, bikeId) => { setAct({ kind: "return", rentId, bikeId }); setConfirm(true); };

  /* ── rent bike ─────────────────────────────────────── */
  const rentBike = async () => {
    // Validate that the hours are a valid positive integer
    if (!act.hours || act.hours <= 0) {
      return setError("Please enter a valid number of hours.");
    }

    setLoad((l) => ({ ...l, action: true }));
    setDateDlg(false);

    try {
      const res = await fetch("http://localhost:5000/rent-bike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          bikeId: act.bikeId,
          hours: act.hours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const bike = bikes.find(b => b.bike_id === act.bikeId);
      if (bike) {
        const total = data.totalPrice || bike.price_per_hour * act.hours;

        setRentals((r) => [
          ...r,
          {
            ...bike,
            rental_id: data.rentalId || Date.now(),
            total_price: total,
          },
        ]);
        setBikes((b) => b.filter((x) => x.bike_id !== act.bikeId));

        setDone({ // success modal
          model: bike.model,
          reg: bike.registration_number,
          total,
        });
      }
      setAct({ ...act, hours: "" });

    } catch (e) { setError(e.message); }
    finally { setLoad((l) => ({ ...l, action: false })); }
  };

  /* ── return bike ───────────────────────────────────── */
  const returnBike = async () => {
    setConfirm(false);
    setLoad((l) => ({ ...l, action: true }));
    try {
      const res = await fetch("http://localhost:5000/return-bike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId: act.rentId, bikeId: act.bikeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const rent = rentals.find((r) => r.rental_id === act.rentId);
      if (rent) {
        setBikes((b) => [
          ...b,
          {
            bike_id: rent.bike_id,
            registration_number: rent.registration_number,
            model: rent.model,
            type: rent.type,
            price_per_hour: rent.price_per_hour || rent.total_price / act.hours,
          },
        ]);
        setRentals((r) => r.filter((x) => x.rental_id !== act.rentId));
      }
    } catch (e) { setError(e.message); }
    finally { setLoad((l) => ({ ...l, action: false })); }
  };

  /* ── filter list ───────────────────────────────────── */
  const shown = filter ? bikes.filter((b) => b.type.toLowerCase() === filter.toLowerCase()) : bikes;

  /* ── JSX ───────────────────────────────────────────── */
  return (
    <div className="cust-dash">
      {/* rental‑done modal */}
      {done && (
        <Modal title="Rental Confirmed" onClose={() => setDone(null)}>
          <p><b>{done.model}</b> ({done.reg})</p>
          <p>Total: ₹{done.total}</p>
          <button className="btn" onClick={() => setDone(null)}>Close</button>
        </Modal>
      )}

      {/* confirm return modal */}
      {confirm && (
        <Modal title="Return Bike?" onClose={() => setConfirm(false)}>
          {error && <p className="error">{error}</p>}
          <div className="btn-row">
            <button className="btn yes" onClick={returnBike} disabled={loading.action}>
              {loading.action ? "..." : "Yes"}
            </button>
            <button className="btn no" onClick={() => setConfirm(false)} disabled={loading.action}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* date picker modal */}
      {dateDlg && (
        <Modal title="Enter Rental Hours" onClose={() => setDateDlg(false)}>
          {error && <p className="error">{error}</p>}
          <label>Hours</label>
          <input
            type="number"
            min="1"
            value={act.hours}
            onChange={(e) => setAct({ ...act, hours: e.target.value })}
            required
          />
          <div className="btn-row">
            <button className="btn primary" onClick={rentBike} disabled={loading.action}>
              {loading.action ? "..." : "Confirm"}
            </button>
            <button className="btn no" onClick={() => setDateDlg(false)} disabled={loading.action}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* top bar */}
      <header className="flex-between">
        <h1>Rent a Bike</h1>
        <button className="btn logout" onClick={() => { localStorage.clear(); setPage("login"); }}>
          Logout
        </button>
      </header>

      {/* filter */}
      <div className="filter">
        <label>Type&nbsp;</label>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All</option>
          <option>Standard</option><option>Electric</option><option>Scooter</option>
          <option>MTB</option><option>Road</option>
        </select>
      </div>

      {/* tabs */}
      <div className="tabs">
        <button className={tab === "available" ? "active" : ""} onClick={() => setTab("available")}>
          Available
        </button>
        <button className={tab === "rentals" ? "active" : ""} onClick={() => { if (tab !== "rentals") loadRentals(); setTab("rentals"); }}>
          My Rentals ({rentals.length})
        </button>
      </div>

      {error && !dateDlg && !confirm && <p className="error center">{error}</p>}

      {/* content */}
      {tab === "available" ? (
        loading.bikes ? <p className="center">Loading…</p> :
          shown.length ? (
            <div className="grid">
              {shown.map(b => (
                <div key={b.bike_id} className="card">
                  <h3>{b.model}</h3>
                  <p>{b.type}</p>
                  <p>₹{b.price_per_hour}/hr</p>
                  <p>{b.registration_number}</p>
                  <button className="btn primary" onClick={() => openRent(b.bike_id)} disabled={loading.action}>
                    Rent
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="center">No bikes available.</p>
      ) : (
        loading.rentals ? <p className="center">Loading…</p> :
          rentals.length ? (
            <div className="grid">
              {rentals.map(r => (
                <div key={r.rental_id} className="card rented">
                  <h3>{r.model}</h3>
                  <p>₹{r.total_price}</p>
                  <p>{r.registration_number}</p>
                  <button className="btn danger"
                    onClick={() => openRet(r.rental_id, r.bike_id)}
                    disabled={loading.action}>
                    Return
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="center">No rentals yet.</p>
      )}
    </div>
  );
}

export default CustomerDashboard;
