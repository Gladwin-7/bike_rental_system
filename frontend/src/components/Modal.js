// components/Modal.js
import React from "react";
import "./Modal.css"; // same styles as you're using now

const Modal = ({ title, children, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>{title}</h3>
                {children}
            </div>
        </div>
    );
};


export default Modal;
