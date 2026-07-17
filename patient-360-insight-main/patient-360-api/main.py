from fastapi import FastAPI, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import database
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig, AutoModelForTokenClassification
from datetime import datetime, timedelta
import random
import shutil
import os
import io
import fitz
import uuid
from PIL import Image
import glob
import torch
from typing import List, Optional
import time
import gc

app = FastAPI(title="MedGuard Enterprise API")

os.makedirs("uploads", exist_ok=True)
os.makedirs("uploads/staff", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🧠 MEMORY MANAGEMENT
# ==========================================
# Notice: All global model loads have been removed from startup.
# Models will now only load when requested, keeping VRAM at 0GB while idle.

def flush_vram():
    """Aggressively clears the GPU memory."""
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

# ==========================================
# 🚀 API MODELS
# ==========================================

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

class IntakeRequest(BaseModel):
    patient_id: str
    ward_type: str
    doctor_id: str
    raw_symptoms: str

class VitalsRequest(BaseModel):
    record_id: str
    blood_pressure: str
    heart_rate: int
    temperature: float
    recorded_by: str 

class PatientRegistration(BaseModel):
    name: str
    age: int
    gender: str
    phone: str
    email: str
    gov_id: str

class BookingRequest(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: str
    booked_by: str 

class CompleteRequest(BaseModel):
    appointment_id: str
    otp_code: str
    doctor_id: str

class CancelRequest(BaseModel):
    appointment_id: str
    patient_id: str

class PaymentRequest(BaseModel):
    bill_id: str
    patient_id: str
    payment_method: str

class PrescriptionItem(BaseModel):
    medication: str
    dosage: str
    frequency: str
    duration: str

class ClinicalVisitRequest(BaseModel):
    appointment_id: str
    patient_id: str
    doctor_id: str
    blood_pressure: str
    heart_rate: int
    temperature: float
    diagnosis: str
    notes: str
    prescriptions: Optional[List[PrescriptionItem]]=[]
    
class ForgotOTPRequest(BaseModel):
    email: str

class ForgotResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str
    
class AIAnalysisRequest(BaseModel):
    patient_id: str
    analysis_type: str

# ==========================================
# 🚀 ENDPOINTS
# ==========================================

@app.post("/api/auth/login")
def login(request: LoginRequest):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cursor = conn.cursor(dictionary=True)
    query = "SELECT * FROM system_users WHERE Email = %s AND Role = %s"
    cursor.execute(query, (request.email, request.role))
    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    if not user or user['Password_Hash'] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid credentials or incorrect role selected."
        )

    return {
        "message": "Login successful",
        "user": {
            "id": user['Entity_ID'], 
            "email": user['Email'],
            "role": user['Role']
        }
    }

@app.post("/api/auth/request-otp")
def request_otp(request: ForgotOTPRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT Entity_ID, Daily_OTP_Count, Last_OTP_Date FROM system_users WHERE Email = %s", (request.email,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="No account found with this email address.")

        today = datetime.now().date()
        current_count = 0 if user['Last_OTP_Date'] != today else user['Daily_OTP_Count']

        if current_count >= 2:
            raise HTTPException(status_code=429, detail="Security Lock: 2 OTP requests per 24 hours exceeded.")

        new_otp = str(random.randint(100000, 999999))
        expiry_time = datetime.now() + timedelta(minutes=15)

        update_query = "UPDATE system_users SET Reset_OTP = %s, OTP_Expiry = %s, Daily_OTP_Count = %s, Last_OTP_Date = %s WHERE Email = %s"
        cursor.execute(update_query, (new_otp, expiry_time, current_count + 1, today, request.email))
        conn.commit()

        print("\n" + "="*50)
        print(f"📱 SMS SIMULATION TO: {request.email}")
        print(f"🔒 Your MedGuard Password Reset Code is: {new_otp}")
        print("="*50 + "\n")

        return {"status": "success", "message": "OTP sent to your registered mobile device."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/auth/reset-password")
def reset_password(request: ForgotResetRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT Entity_ID, Reset_OTP, OTP_Expiry FROM system_users WHERE Email = %s", (request.email,))
        user = cursor.fetchone()

        if not user or not user['Reset_OTP']:
            raise HTTPException(status_code=400, detail="No active OTP found. Request a new one.")
        if user['Reset_OTP'] != request.otp:
            raise HTTPException(status_code=401, detail="Invalid OTP code.")
        if datetime.now() > user['OTP_Expiry']:
            raise HTTPException(status_code=401, detail="OTP has expired.")

        update_query = "UPDATE system_users SET Password_Hash = %s, Reset_OTP = NULL, OTP_Expiry = NULL WHERE Email = %s"
        cursor.execute(update_query, (request.new_password, request.email))
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        cursor.execute(audit_query, ("PASSWORD_RESET", f"Password reset via OTP on login screen.", user['Entity_ID']))

        conn.commit()
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/api/patients")
def get_patients():
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM patient")
        patients = cursor.fetchall()
        
        formatted_patients = []
        for p in patients:
            formatted_patients.append({
                "id": p["Patient_ID"],
                "name": p["Name"],
                "age": p["Age"],
                "gender": p["Gender"],
                "phone": p["Phone"],
                "email": p["Email"]
            })
        return formatted_patients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/patients/{patient_id}/full")
def get_full_patient_profile(patient_id: str):
    conn = database.get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM patient WHERE Patient_ID = %s", (patient_id,))
        patient_data = cursor.fetchone()
        
        if not patient_data:
            raise HTTPException(status_code=404, detail="Patient not found")

        history_query = """
        SELECT m.Record_ID, m.Created_Date, m.Diagnosis, m.Notes, 
               d.Name as Doctor_Name, d.Specialization,
               v.Blood_Pressure, v.Heart_Rate, v.Temperature
        FROM medical_record m
        LEFT JOIN doctor d ON m.Doctor_ID = d.Doctor_ID
        LEFT JOIN vitals_log v ON m.Record_ID = v.Record_ID
        WHERE m.Patient_ID = %s
        ORDER BY m.Created_Date DESC
        """
        cursor.execute(history_query, (patient_id,))
        medical_history = cursor.fetchall()

        for record in medical_history:
            if record['Created_Date']:
                record['Created_Date'] = record['Created_Date'].isoformat()

        appt_query = """
        SELECT a.Appointment_ID, a.Appointment_Date, a.Status, d.Name as Doctor_Name
        FROM appointment a
        LEFT JOIN doctor d ON a.Doctor_ID = d.Doctor_ID
        WHERE a.Patient_ID = %s AND a.Status = 'Scheduled'
        ORDER BY a.Appointment_Date ASC
        """
        cursor.execute(appt_query, (patient_id,))
        upcoming_appts = cursor.fetchall()
        
        for appt in upcoming_appts:
            if appt['Appointment_Date']:
                appt['Appointment_Date'] = appt['Appointment_Date'].isoformat()
                
        lab_query = "SELECT * FROM lab_reports WHERE Patient_ID = %s ORDER BY Upload_Date DESC"
        cursor.execute(lab_query, (patient_id,))
        lab_reports = cursor.fetchall()
        
        for lab in lab_reports:
            if lab['Upload_Date']:
                lab['Upload_Date'] = lab['Upload_Date'].isoformat()        

        return {
            "demographics": patient_data,
            "medical_history": medical_history,
            "upcoming_appointments": upcoming_appts,
            "lab_reports": lab_reports
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/records")
def get_records():
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM medical_record")
        records = cursor.fetchall()
        
        formatted_records = []
        for r in records:
            date_str = r["Created_Date"].isoformat() if r["Created_Date"] else ""
            formatted_records.append({
                "id": r["Record_ID"],
                "patientId": r["Patient_ID"],
                "doctorId": r["Doctor_ID"],
                "date": date_str,
                "diagnosis": r["Diagnosis"],
                "notes": r["Notes"],
                "visitId": r["Visit_ID"]
            })
        return formatted_records
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/doctors")
def get_doctors():
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM doctor")
        doctors = cursor.fetchall()
        
        formatted_doctors = []
        for d in doctors:
            formatted_doctors.append({
                "id": d["Doctor_ID"],
                "name": d["Name"],
                "specialization": d["Specialization"]
            })
        return formatted_doctors
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/patients/register")
def register_patient(request: PatientRegistration):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        new_patient_id = f"P{random.randint(100, 999)}"
        
        insert_query = """
        INSERT INTO patient (Patient_ID, Name, Age, Gender, Phone, Email, Government_ID)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            new_patient_id, request.name, request.age, request.gender, request.phone, request.email, request.gov_id
        ))
        
        user_query = "INSERT INTO system_users (Email, Password_Hash, Role, Entity_ID) VALUES (%s, %s, 'patient', %s)"
        cursor.execute(user_query, (request.email, "patientpass123", new_patient_id))
        
        conn.commit()
        return {"status": "success", "patient_id": new_patient_id, "message": "Patient officially registered."}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close() 

# ==========================================
# 🧠 AI MODULE: RECEPTIONIST INTAKE (NER)
# ==========================================
@app.post("/api/intake")
def process_intake(request: IntakeRequest):
    print("\n--- PHASE C: WAKING UP NER MODEL ---")
    flush_vram()
    try:
        # Dynamic Lazy Load
        ner_pipeline = pipeline(
            "ner", 
            model="./local_ner_model", 
            tokenizer="./local_ner_model",
            aggregation_strategy="simple",
            device=0 if torch.cuda.is_available() else -1
        )
        
        ai_results = ner_pipeline(request.raw_symptoms)
        
        extracted_symptoms = []
        for entity in ai_results:
            clean_word = entity['word'].replace(' ', '').replace(' ', '').strip().capitalize()
            if clean_word and clean_word not in extracted_symptoms:
                extracted_symptoms.append(clean_word)
                
        if not extracted_symptoms:
            extracted_symptoms.append("General clinical observation")
            
        structured_notes = f"Ward: {request.ward_type} | AI Extracted: {', '.join(extracted_symptoms)}"
        primary_diagnosis = extracted_symptoms[0] 
        
        conn = database.get_db_connection()
        cursor = conn.cursor()
        
        new_record_id = f"MR{random.randint(100, 999)}"
        new_visit_id = f"V{random.randint(100, 999)}"
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        visit_query = """
        INSERT INTO visit (Visit_ID, Patient_ID, Doctor_ID, Visit_Date)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(visit_query, (new_visit_id, request.patient_id, request.doctor_id, current_date))

        record_query = """
        INSERT INTO medical_record (Record_ID, Patient_ID, Doctor_ID, Created_Date, Diagnosis, Notes, Visit_ID)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(record_query, (
            new_record_id, request.patient_id, request.doctor_id, current_date, 
            primary_diagnosis, structured_notes, new_visit_id
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {
            "status": "success",
            "ai_analysis": {
                "detected_symptoms": extracted_symptoms,
                "database_record_id": new_record_id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Intake Processing Failed: {str(e)}")
    finally:
        print("--- UNLOADING NER MODEL & CLEARING VRAM ---")
        if 'ner_pipeline' in locals():
            del ner_pipeline
        flush_vram()

# ==========================================
# 🧠 AI MODULE: CLINICAL COPILOT (VLM + LLM)
# ==========================================
# ==========================================================
# 🧠 AI MODULE: CLINICAL COPILOT (VLM + LLM)
# ==========================================================
@app.post("/api/vlm/analyze")
def analyze_patient_records(request: AIAnalysisRequest):
    patient_id = request.patient_id
    analysis_type = request.analysis_type
    
    # 1. FETCH MYSQL HISTORY
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    past_history_text = "No prior clinical history."
    try:
        cursor.execute("SELECT Diagnosis, Notes FROM medical_record WHERE Patient_ID = %s ORDER BY Created_Date DESC LIMIT 5", (patient_id,))
        records = cursor.fetchall()
        if records:
            past_history_text = "\n".join([f"- {r['Diagnosis']}: {r['Notes']}" for r in records])
    finally:
        cursor.close()
        conn.close()

    # 2. LOCATE FILES
    matching_files = glob.glob(os.path.join("uploads", f"{patient_id}_*"))
    if not matching_files:
        raise HTTPException(status_code=404, detail="No files found.")

    all_extracted_reports_text = ""
    extraction_prompt = "Read this lab report table line by line. List every test name, its numerical value, its units, and look closely for any 'H' or 'L' flag markers. Format clearly."

    # ----------------------------------------------------------
    # PHASE A: MOONDREAM VISION EXTRACTION
    # ----------------------------------------------------------
    print("\n--- PHASE A: LOADING MOONDREAM ---")
    flush_vram()
    
    try:
        from local_vlm_model.hf_moondream import HfMoondream
        md_model = HfMoondream.from_pretrained("./local_vlm_model")
        
        if torch.cuda.is_available():
            md_model = md_model.to(torch.bfloat16).cuda()
        
        for file_path in matching_files:
            filename = os.path.basename(file_path)
            if file_path.lower().endswith(".pdf"):
                pdf_doc = fitz.open(file_path)
                for page_num in range(min(len(pdf_doc), 2)):
                    page = pdf_doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=200)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    res = md_model.query(img, extraction_prompt)
                    all_extracted_reports_text += f"\n📁 [File: {filename} | Page {page_num+1}]\n{res['answer']}\n"
            else:
                img = Image.open(file_path).convert("RGB")
                res = md_model.query(img, extraction_prompt)
                all_extracted_reports_text += f"\n📁 [File: {filename}]\n{res['answer']}\n"
                
    except Exception as md_error:
        print(f"❌ MOONDREAM ERROR: {md_error}")
        raise HTTPException(status_code=500, detail=f"Vision Extraction Failed: {str(md_error)}")
        
    finally:
        print("--- UNLOADING MOONDREAM & CLEARING VRAM ---")
        if 'md_model' in locals(): del md_model
        flush_vram()

    # ----------------------------------------------------------
    # PHASE B: QWEN REASONING ENGINE
    # ----------------------------------------------------------
    # ----------------------------------------------------------
    # PHASE B: QWEN REASONING ENGINE
    # ----------------------------------------------------------
    print("\n--- PHASE B: LOADING QWEN ---")
    
    try:
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True, 
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True
        )
        
        qwen_tokenizer = AutoTokenizer.from_pretrained("./local_reasoning_model", trust_remote_code=True)
        qwen_model = AutoModelForCausalLM.from_pretrained(
            "./local_reasoning_model",
            trust_remote_code=True,
            quantization_config=quant_config,
            device_map="cuda" 
        )

        # 1. Define base instructions
        system_prompt = """
You are MedVault AI, an evidence-based clinical decision support assistant.
Your purpose is to assist licensed physicians.

Rules:
1. Use ONLY the supplied laboratory values and medical history.
2. Never invent laboratory values or diagnoses.
3. Use cautious medical language (e.g., "may suggest", "could indicate").
4. If information is insufficient, say so clearly.
5. Never recommend starting/stopping medications; only mention medication classes for physician consideration.
6. State confidence based on evidence.
Respond professionally using Markdown.
"""

        # 2. Define dynamic formats based on analysis_type
        full_format = """
Produce a clinical report using the following 9 sections:
# 1. Clinical Summary (4–6 sentences)
# 2. Laboratory Findings (List important values/abnormalities)
# 3. Clinical Interpretation (Distinguish Evidence/Interpretation/Uncertainty)
# 4. Relationship With Medical History
# 5. Recommended Follow-up (Blood tests, Imaging, etc. and WHY)
# 6. Lifestyle Recommendations (Diet, Exercise, etc.)
# 7. Medication Considerations (Classes only, no dosages)
# 8. Red Flags (Urgent items)
# 9. Confidence (State High/Moderate/Low and explain)
"""
        
        if analysis_type == "abnormalities":
            target_format = "Provide a list of ONLY the abnormal laboratory findings, red flags, and immediate clinical risks. Do not include normal values or lifestyle advice."
        elif analysis_type == "summary":
            target_format = "Provide a brief, 3-sentence high-level clinical summary for rapid triage. No complex formatting."
        else:
            target_format = full_format

        # 3. Build prompt
        user_prompt = f"""
The following information belongs to ONE patient.

==========================================================
PATIENT MEDICAL HISTORY
==========================================================
{past_history_text}

==========================================================
CURRENT LABORATORY RESULTS
==========================================================
{all_extracted_reports_text.strip()}

==========================================================
Carefully analyse BOTH the laboratory findings and the patient's history.

{target_format}

IMPORTANT RULES: Never invent values. Do not overdiagnose. Keep the report professional.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        text = qwen_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = qwen_tokenizer(text, return_tensors="pt").to("cuda")
        
        print("-> Generating clinical assessment...")
        start_time = time.time()
        
        with torch.inference_mode():
            outputs = qwen_model.generate(
                **inputs,
                max_new_tokens=800, 
                do_sample=False,
                temperature=None,
                top_p=None,
                top_k=None,
                repetition_penalty=1.05,
                use_cache=True,
                pad_token_id=qwen_tokenizer.eos_token_id,
                eos_token_id=qwen_tokenizer.eos_token_id
            )
        
        print(f"✓ Generation finished in {time.time() - start_time:.2f} sec")
        
        qwen_response = qwen_tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        
        clinical_dossier = f"""==================================================
🏥 MEDVAULT CLINICAL INTEGRATION REPORT
==================================================
[RAW VLM EXTRACTIONS]
{all_extracted_reports_text.strip()}
==================================================

{qwen_response.strip()}
"""
        return {"status": "success", "patient_id": patient_id, "analysis": clinical_dossier}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        print("--- UNLOADING QWEN & CLEARING VRAM ---")
        if 'qwen_model' in locals(): del qwen_model
        if 'qwen_tokenizer' in locals(): del qwen_tokenizer
        flush_vram()

# ==========================================
# 🚀 ADDITIONAL ROUTES (Appointments, etc.)
# ==========================================

@app.get("/api/appointments")
def get_appointments():
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT 
            a.Appointment_ID as id, 
            a.Appointment_Date as date, 
            a.Status as status, 
            a.Patient_ID as patientId, 
            a.Doctor_ID as doctorId,
            p.Name as patientName,
            d.Name as doctorName,
            d.Specialization as specialization,
            a.OTP_Code as otp
        FROM appointment a
        JOIN patient p ON a.Patient_ID = p.Patient_ID
        JOIN doctor d ON a.Doctor_ID = d.Doctor_ID
        ORDER BY a.Appointment_Date DESC
        """
        cursor.execute(query)
        appointments = cursor.fetchall()
        
        for appt in appointments:
            if appt['date']:
                appt['date'] = appt['date'].isoformat()
                
        return appointments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/appointments/book")
def book_appointment(request: BookingRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        secure_otp = str(random.randint(100000, 999999))
        new_apt_id = f"A{random.randint(100, 999)}"
        
        insert_query = """
        INSERT INTO appointment (Appointment_ID, Patient_ID, Doctor_ID, Appointment_Date, Status, OTP_Code)
        VALUES (%s, %s, %s, %s, 'Scheduled', %s)
        """
        cursor.execute(insert_query, (
            new_apt_id, request.patient_id, request.doctor_id, request.appointment_date, secure_otp
        ))
        
        audit_query = """
        INSERT INTO audit_trail (Action_Type, Description, Performed_By)
        VALUES (%s, %s, %s)
        """
        audit_desc = f"Booked Appointment {new_apt_id} for Patient {request.patient_id} with Doctor {request.doctor_id}"
        cursor.execute(audit_query, ("BOOKING_CREATED", audit_desc, request.booked_by))
        
        conn.commit()
        return {
            "status": "success", 
            "message": "Appointment officially booked.", 
            "otp_generated": secure_otp
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/appointments/complete")
def complete_appointment(request: CompleteRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT OTP_Code FROM appointment WHERE Appointment_ID = %s", (request.appointment_id,))
        appt = cursor.fetchone()
        
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found.")
            
        if appt['OTP_Code'] != request.otp_code:
            raise HTTPException(status_code=400, detail="Invalid OTP Handshake. Verification Failed.")
            
        cursor.execute("UPDATE appointment SET Status = 'Completed' WHERE Appointment_ID = %s", (request.appointment_id,))
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        audit_desc = f"Verified OTP and Completed Appointment {request.appointment_id}"
        cursor.execute(audit_query, ("VISIT_COMPLETED", audit_desc, request.doctor_id))
        
        conn.commit()
        return {"status": "success", "message": "Secure Handshake Verified. Visit Completed."}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/appointments/cancel")
def cancel_appointment(request: CancelRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE appointment SET Status = 'Cancelled' WHERE Appointment_ID = %s", (request.appointment_id,))
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        audit_desc = f"Cancelled Appointment {request.appointment_id}"
        cursor.execute(audit_query, ("VISIT_CANCELLED", audit_desc, request.patient_id))
        
        conn.commit()
        return {"status": "success", "message": "Appointment cancelled."}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/vitals")
def add_vitals(request: VitalsRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        insert_query = """
        INSERT INTO vitals_log (Record_ID, Blood_Pressure, Heart_Rate, Temperature, Recorded_By)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            request.record_id, 
            request.blood_pressure, 
            request.heart_rate, 
            request.temperature, 
            request.recorded_by
        ))
        conn.commit()
        return {"message": "Vitals successfully logged to MedVault"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/visits/complete")
def complete_clinical_visit(request: ClinicalVisitRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        record_id = f"MR{random.randint(1000, 9999)}"
        
        mr_query = """
        INSERT INTO medical_record (Record_ID, Patient_ID, Doctor_ID, Diagnosis, Notes, Created_Date)
        VALUES (%s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(mr_query, (record_id, request.patient_id, request.doctor_id, request.diagnosis, request.notes))
        
        v_query = """
        INSERT INTO vitals_log (Record_ID, Blood_Pressure, Heart_Rate, Temperature, Recorded_By)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(v_query, (record_id, request.blood_pressure, request.heart_rate, request.temperature, request.doctor_id))
        
        if request.prescriptions and len(request.prescriptions) > 0:
            rx_query = """
            INSERT INTO prescription (Prescription_ID, Medication, Dosage, Record_ID)
            VALUES (%s, %s, %s, %s)
            """
            for rx in request.prescriptions:
                rx_id = f"PR{random.randint(1000, 9999)}"
                cursor.execute(rx_query, (rx_id, rx.medication, rx.dosage, record_id))
        
        apt_query = "UPDATE appointment SET Status = 'Completed' WHERE Appointment_ID = %s"
        cursor.execute(apt_query, (request.appointment_id,))
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        audit_desc = f"Completed Clinical Visit {request.appointment_id} for Patient {request.patient_id}"
        cursor.execute(audit_query, ("CONSULTATION_COMPLETED", audit_desc, request.doctor_id))
        
        conn.commit()
        return {"status": "success", "message": "EHR successfully signed and sealed into MedVault."}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/labs/upload")
def upload_lab_report(
    patient_id: str = Form(...), 
    test_name: str = Form(...), 
    uploader_id: str = Form(...), 
    file: UploadFile = File(...)
):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        safe_filename = f"{patient_id}_{random.randint(1000,9999)}_{file.filename.replace(' ', '_')}"
        file_path = f"uploads/{safe_filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"http://127.0.0.1:8000/uploads/{safe_filename}"
        new_report_id = f"LAB{random.randint(100, 999)}"
        
        insert_query = """
        INSERT INTO lab_reports (Report_ID, Patient_ID, Test_Name, File_URL, Uploaded_By)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (new_report_id, patient_id, test_name, file_url, uploader_id))
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        cursor.execute(audit_query, ("LAB_UPLOADED", f"Uploaded {test_name} for Patient {patient_id}", uploader_id))
        
        conn.commit()
        return {"status": "success", "message": "File securely uploaded and linked to EHR.", "url": file_url}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/api/billing/{patient_id}")
def get_patient_bills(patient_id: str):
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
        SELECT 
            Bill_ID, 
            Patient_ID, 
            Amount, 
            Description, 
            Payment_Status as Status, 
            Transaction_ID, 
            Created_At as Generated_Date
        FROM billing 
        WHERE Patient_ID = %s 
        ORDER BY Created_At DESC
        """
        cursor.execute(query, (patient_id,))
        bills = cursor.fetchall()
        
        for bill in bills:
            if bill['Generated_Date']:
                bill['Generated_Date'] = bill['Generated_Date'].isoformat()
                
        return bills
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/billing/pay")
def process_payment(request: PaymentRequest):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    try:
        transaction_id = f"txn_{random.randint(10000000, 99999999)}"
        
        update_query = """
        UPDATE billing 
        SET Payment_Status = 'Paid', 
            Transaction_ID = %s, 
            Updated_By = %s, 
            Updated_At = NOW()
        WHERE Bill_ID = %s AND Patient_ID = %s
        """
        cursor.execute(update_query, (transaction_id, request.patient_id, request.bill_id, request.patient_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bill not found or unauthorized.")
        
        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        audit_desc = f"Processed payment of bill {request.bill_id} via {request.payment_method}. TXN: {transaction_id}"
        cursor.execute(audit_query, ("PAYMENT_PROCESSED", audit_desc, request.patient_id))
        
        conn.commit()
        return {
            "status": "success", 
            "message": "Payment verified securely.", 
            "transaction_id": transaction_id
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/api/admin/register-staff")
async def register_staff(
    firstName: str = Form(...),
    lastName: str = Form(...),
    role: str = Form(...),
    specialization: str = Form(""),
    licenseNumber: str = Form(""),
    phone: str = Form(...),
    personalEmail: str = Form(...),
    govIdFile: UploadFile = File(...),
    signatureFile: UploadFile = File(None)
):
    os.makedirs("uploads/staff", exist_ok=True)
    conn = database.get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        clean_first = firstName.strip().lower()
        clean_last = lastName.strip().lower()
        hospital_email = f"dr.{clean_first}.{clean_last}@hospital.com" if role == "doctor" else f"{clean_first}.{clean_last}@hospital.com"

        cursor.execute("SELECT Email FROM system_users WHERE Email = %s", (hospital_email,))
        if cursor.fetchone():
            hospital_email = f"{clean_first}.{clean_last}{random.randint(100, 999)}@hospital.com"

        temp_password = f"MedGuard-{random.randint(1000, 9999)}!"
        entity_id = ""
        full_name = f"{firstName.strip()} {lastName.strip()}"

        gov_path = f"uploads/staff/{firstName}_{lastName}_gov_{govIdFile.filename}"
        with open(gov_path, "wb") as buffer:
            shutil.copyfileobj(govIdFile.file, buffer)
            
        sig_path = ""
        if signatureFile:
            sig_path = f"uploads/staff/{firstName}_{lastName}_sig_{signatureFile.filename}"
            with open(sig_path, "wb") as buffer:
                shutil.copyfileobj(signatureFile.file, buffer)

        if role == "doctor":
            entity_id = f"D{random.randint(1000, 9999)}"
            doc_query = """
                INSERT INTO doctor 
                (Doctor_ID, Name, Specialization, Email, Phone, License_Number, Personal_Email, Gov_ID_Path, Signature_Path) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(doc_query, (entity_id, f"Dr. {full_name}", specialization, hospital_email, phone, licenseNumber, personalEmail, gov_path, sig_path))
        else:
            prefix = role[0].upper()
            entity_id = f"{prefix}{random.randint(1000, 9999)}"
            staff_query = "INSERT INTO hospital_staff (Staff_ID, Name, Role, Phone, Personal_Email, Gov_ID_Path) VALUES (%s, %s, %s, %s, %s, %s)"
            cursor.execute(staff_query, (entity_id, full_name, role, phone, personalEmail, gov_path))

        sys_query = "INSERT INTO system_users (Email, Password_Hash, Role, Entity_ID) VALUES (%s, %s, %s, %s)"
        cursor.execute(sys_query, (hospital_email, temp_password, role, entity_id))

        audit_query = "INSERT INTO audit_trail (Action_Type, Description, Performed_By) VALUES (%s, %s, %s)"
        cursor.execute(audit_query, ("STAFF_PROVISIONED", f"Created {role} account for {hospital_email}", "A001"))

        conn.commit()
        return {"status": "success", "hospital_email": hospital_email, "temp_password": temp_password}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()