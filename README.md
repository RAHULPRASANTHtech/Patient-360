# 🏥 Patient 360 – AI Powered Intelligent Healthcare Management Platform

> **An AI-driven Electronic Health Record (EHR) platform that combines Medical Named Entity Recognition (NER), Vision Language Models (VLM), and Large Language Models (LLMs) to assist receptionists and physicians with intelligent clinical workflows.**

---

## 📌 Overview

Patient 360 is a full-stack healthcare management platform designed to simplify clinical workflows using Artificial Intelligence.

Instead of acting as a traditional hospital management system, Patient 360 introduces an intelligent AI pipeline capable of:

- 📄 Reading laboratory reports automatically
- 🧠 Understanding medical terminology
- 👨‍⚕️ Generating clinician-friendly medical summaries
- 📊 Maintaining longitudinal patient history
- ⚡ Reducing manual data entry and improving clinical efficiency

The platform demonstrates how multiple AI models can collaborate together inside a real healthcare workflow.

---

# 🚀 Key Features

### 👨‍💼 Reception Intelligence (Medical NER)

Reception staff can upload patient information or clinical text.

A locally hosted Medical NER model automatically extracts:

- Diseases
- Symptoms
- Medications
- Procedures
- Laboratory Tests
- Medical Conditions

This reduces manual documentation effort while improving consistency.

---

### 🩺 Medical Report Understanding (Vision AI)

Patient laboratory reports (Images/PDFs) are processed using a locally deployed Vision Language Model.

The model automatically extracts:

- Laboratory Tests
- Numerical Values
- Units
- High / Low Indicators
- Diagnostic Tables

Supported inputs:

- JPG
- PNG
- PDF

---

### 🧠 AI Clinical Reasoning

After extracting structured laboratory data, the system combines:

- Current laboratory findings
- Previous medical history
- Existing diagnoses

These are passed into a locally hosted reasoning LLM which generates:

- Clinical Summary
- Possible Interpretation
- Follow-up Recommendations
- Lifestyle Advice
- Medication Considerations
- Physician Notes

---

### 📁 Longitudinal Patient History

Patient history is retrieved directly from MySQL and merged with the latest diagnostic reports, enabling longitudinal clinical reasoning instead of isolated report analysis.

---

### 🔍 Intelligent Medical Search

Healthcare providers can quickly retrieve:

- Previous diagnoses
- Patient visits
- Clinical notes
- Historical laboratory reports

from a centralized dashboard.

---

# 🧠 AI Architecture

```
                    Patient Information
                           │
                           ▼
                Reception Intake Module
                           │
                           ▼
             Medical Named Entity Recognition
                 (Local DeBERTa-v2 NER)
                           │
                           ▼
              Structured Medical Database
                           │
                           ▼
              Uploaded Laboratory Reports
                           │
                           ▼
             Vision Language Model (Moondream)
         Extracts Tests, Values & Clinical Tables
                           │
                           ▼
               Structured Laboratory Data
                           │
                           ▼
        Patient History + Current Laboratory Data
                           │
                           ▼
             Qwen Medical Reasoning Model
                           │
                           ▼
      Clinical Summary • Interpretation • Follow-up
                           │
                           ▼
                  Physician Decision Support
```

---

# ⚙️ Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- ShadCN UI

---

## Backend

- FastAPI
- Python
- Node.js
- Express.js

---

## Database

- MySQL

---

## Artificial Intelligence

### Medical NER

- DeBERTa-v2 Medical NER

Purpose:

- Disease Extraction
- Medication Extraction
- Medical Entity Recognition

---

### Vision Language Model

- Moondream VLM

Purpose:

- Laboratory Report Reading
- PDF Analysis
- Medical Image Understanding

---

### Medical Reasoning LLM

- Qwen 2.5 3B Instruct

Purpose:

- Clinical Interpretation
- Medical Summary
- Follow-up Recommendations

---

## Supporting Libraries

- PyTorch
- Transformers
- Accelerate
- BitsAndBytes
- Pillow
- PyMuPDF
- HuggingFace Transformers

---

# 🧩 Project Workflow

```
Patient
    │
    ▼
Reception
    │
    ▼
Medical NER
    │
    ▼
Patient Database
    │
    ▼
Doctor uploads report
    │
    ▼
Moondream VLM
    │
    ▼
Structured Medical Data
    │
    ▼
Patient History
    │
    ▼
Qwen Clinical Reasoning
    │
    ▼
AI Generated Clinical Report
    │
    ▼
Doctor Review
```

---

# 📊 AI Pipeline

## Stage 1

Medical Entity Recognition

Input

```
Patient complains of chest pain and is taking Metformin.
```

Output

```
Disease
Medication
Symptoms
Medical Conditions
```

---

## Stage 2

Vision Language Model

Input

```
Laboratory Report
```

Output

```
Glucose
297 mg/dL

Creatinine
0.60 mg/dL

eGFR
106
```

---

## Stage 3

Clinical Reasoning

Input

- Previous Medical History
- Current Laboratory Findings

Output

- Clinical Summary
- Medical Interpretation
- Follow-up Suggestions
- Lifestyle Advice

---

# 🏗 Repository Structure

```
Patient-360/

├── patient-360-api/
│     ├── AI Models
│     ├── FastAPI Backend
│     ├── Medical Reasoning
│     └── Vision Processing
│
├── patient-360-backend/
│     ├── Express APIs
│     └── Authentication
│
├── src/
│     ├── Dashboard
│     ├── Reception
│     ├── MedVault
│     ├── Patient Management
│     └── Components
│
└── public/
```

---

# 💡 Highlights

✅ End-to-End Healthcare AI Workflow

✅ Fully Local AI Inference

✅ Medical Named Entity Recognition

✅ Vision Language Model Integration

✅ Large Language Model Clinical Reasoning

✅ Multi-Model AI Pipeline

✅ FastAPI + React Architecture

✅ Modern Healthcare Dashboard

---

# 📈 Future Enhancements

- Voice-based Clinical Assistant
- DICOM Image Analysis
- Drug Interaction Detection
- Clinical Risk Prediction
- Explainable AI Reports
- Multi-language Medical Support
- FHIR Integration
- HL7 Compatibility

---

# 👨‍💻 Author

**Rahul Prasanth**

Computer Science Engineering Student

Artificial Intelligence • Full Stack Development • Healthcare AI • Computer Vision • NLP

GitHub:
https://github.com/RAHULPRASANTHtech

---

# ⭐ Project Vision

Patient 360 demonstrates how multiple AI models can work together inside a modern healthcare platform.

Instead of replacing clinicians, the system augments clinical decision-making by combining structured medical records, computer vision, natural language processing, and reasoning models into a unified workflow that assists healthcare professionals throughout the patient journey.
