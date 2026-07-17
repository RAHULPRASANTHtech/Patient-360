const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();
const pool = require('./db');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows your React frontend to communicate with this backend
app.use(express.json()); // Parses incoming JSON requests (like form submissions)


// 1. Get Patient Registry
app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Patient');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Doctor/Patient JOIN (For Appointments Page)
app.get('/api/appointments', async (req, res) => {
    try {
        const query = `
            SELECT A.Appointment_ID as id, A.Appointment_Date as date, A.Status as status,
                   P.Patient_ID as patientId, P.Name as patientName, 
                   D.Doctor_ID as doctorId, D.Name as doctorName, D.Specialization as specialization
            FROM Appointment A
            JOIN Patient P ON A.Patient_ID = P.Patient_ID
            JOIN Doctor D ON A.Doctor_ID = D.Doctor_ID
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Get Longitudinal Medical Records (MedVault View)
app.get('/api/medical-records', async (req, res) => {
    try {
        const query = `
            SELECT M.Record_ID as id, M.Created_Date as date, M.Diagnosis as diagnosis, M.Notes as notes, M.Visit_ID as visitId,
                   P.Patient_ID as patientId, P.Name as patientName, 
                   D.Doctor_ID as doctorId, D.Name as doctorName
            FROM Medical_Record M
            JOIN Patient P ON M.Patient_ID = P.Patient_ID
            JOIN Doctor D ON M.Doctor_ID = D.Doctor_ID
            ORDER BY M.Created_Date DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Add New Clinical Entry (Append-Only MedVault Logic)
app.post('/api/medical-records', async (req, res) => {
    const { visitId, diagnosis, notes } = req.body;
    try {
        // Step A: Fetch associated Patient and Doctor from the Visit ID
        const [visitRows] = await pool.query('SELECT Patient_ID, Doctor_ID FROM Visit WHERE Visit_ID = ?', [visitId]);
        if (visitRows.length === 0) return res.status(404).json({ error: 'Visit ID not found in database.' });

        const patientId = visitRows[0].Patient_ID;
        const doctorId = visitRows[0].Doctor_ID;
        
        // Generate a simple Record ID (e.g., MR015)
        const recordId = 'MR' + Math.floor(Math.random() * 900 + 100); 
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Step B: Insert into Medical_Record
        await pool.query(
            'INSERT INTO Medical_Record (Record_ID, Patient_ID, Doctor_ID, Created_Date, Diagnosis, Notes, Visit_ID) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [recordId, patientId, doctorId, date, diagnosis, notes, visitId]
        );
        res.status(201).json({ message: 'Record appended to longitudinal history successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Get Financials & Billing
app.get('/api/billing', async (req, res) => {
    try {
        const query = `
            SELECT B.Bill_ID as id, B.Visit_Date as visitDate, B.Amount as amount, B.Payment_Status as status,
                   P.Patient_ID as patientId, P.Name as patientName
            FROM Billing B
            JOIN Patient P ON B.Patient_ID = P.Patient_ID
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Update Billing Status (DML Operation)
app.put('/api/billing/:id/pay', async (req, res) => {
    try {
        await pool.query('UPDATE Billing SET Payment_Status = ? WHERE Bill_ID = ?', ['Paid', req.params.id]);
        res.json({ message: 'Payment status updated to Paid' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// 🩺 VITALS LOG (Real-Time Data)
// ==========================================

// Add new real-time vitals
app.post('/api/vitals', async (req, res) => {
    const { recordId, bloodPressure, heartRate, temperature, recordedBy } = req.body;
    try {
        await pool.query(
            'INSERT INTO Vitals_Log (Record_ID, Blood_Pressure, Heart_Rate, Temperature, Recorded_By) VALUES (?, ?, ?, ?, ?)',
            [recordId, bloodPressure, heartRate, temperature, recordedBy]
        );
        res.status(201).json({ message: 'Vitals recorded successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search Medical Records by Date (Demonstrating WHERE clause)
app.get('/api/medical-records/search', async (req, res) => {
    const { date } = req.query; // e.g., ?date=2026-03-12
    try {
        const query = `
            SELECT M.Record_ID as id, M.Created_Date as date, M.Diagnosis as diagnosis, 
                   P.Name as patientName, D.Name as doctorName
            FROM Medical_Record M
            JOIN Patient P ON M.Patient_ID = P.Patient_ID
            JOIN Doctor D ON M.Doctor_ID = D.Doctor_ID
            WHERE M.Created_Date = ?
        `;
        const [rows] = await pool.query(query, [date]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Start the server
app.listen(port, () => {
    console.log(`🏥 Patient 360° API Server is running on port ${port}`);
});