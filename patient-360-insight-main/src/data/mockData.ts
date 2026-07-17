// Mock data simulating database tables

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
}

export interface Appointment {
  id: string;
  date: string;
  patientId: string;
  doctorId: string;
  status: "Scheduled" | "Completed" | "Cancelled";
}

export interface Bill {
  id: string;
  patientId: string;
  visitDate: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Pending";
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  diagnosis: string;
  notes: string;
  visitId: string;
}

export const patients: Patient[] = [
  { id: "P001", name: "Sarah Mitchell", age: 34, gender: "Female", phone: "555-0101", email: "sarah@email.com" },
  { id: "P002", name: "James Rodriguez", age: 58, gender: "Male", phone: "555-0102", email: "james@email.com" },
  { id: "P003", name: "Emily Chen", age: 27, gender: "Female", phone: "555-0103", email: "emily@email.com" },
  { id: "P004", name: "Michael Okonkwo", age: 45, gender: "Male", phone: "555-0104", email: "michael@email.com" },
  { id: "P005", name: "Priya Sharma", age: 31, gender: "Female", phone: "555-0105", email: "priya@email.com" },
  { id: "P006", name: "David Thompson", age: 62, gender: "Male", phone: "555-0106", email: "david@email.com" },
  { id: "P007", name: "Ana Vasquez", age: 40, gender: "Female", phone: "555-0107", email: "ana@email.com" },
  { id: "P008", name: "Robert Kim", age: 52, gender: "Male", phone: "555-0108", email: "robert@email.com" },
];

export const doctors: Doctor[] = [
  { id: "D001", name: "Dr. Amara Williams", specialization: "Cardiology" },
  { id: "D002", name: "Dr. Raj Patel", specialization: "Neurology" },
  { id: "D003", name: "Dr. Olivia Santos", specialization: "Dermatology" },
  { id: "D004", name: "Dr. Chen Wei", specialization: "Orthopedics" },
  { id: "D005", name: "Dr. Fatima Al-Hassan", specialization: "Pediatrics" },
  { id: "D006", name: "Dr. Marcus Johnson", specialization: "General Practice" },
];

export const appointments: Appointment[] = [
  { id: "A001", date: "2026-03-20", patientId: "P001", doctorId: "D001", status: "Scheduled" },
  { id: "A002", date: "2026-03-18", patientId: "P002", doctorId: "D002", status: "Completed" },
  { id: "A003", date: "2026-03-21", patientId: "P003", doctorId: "D003", status: "Scheduled" },
  { id: "A004", date: "2026-03-15", patientId: "P004", doctorId: "D004", status: "Completed" },
  { id: "A005", date: "2026-03-22", patientId: "P005", doctorId: "D005", status: "Scheduled" },
  { id: "A006", date: "2026-03-10", patientId: "P006", doctorId: "D001", status: "Completed" },
  { id: "A007", date: "2026-03-19", patientId: "P007", doctorId: "D006", status: "Cancelled" },
  { id: "A008", date: "2026-03-23", patientId: "P008", doctorId: "D002", status: "Scheduled" },
  { id: "A009", date: "2026-03-12", patientId: "P001", doctorId: "D003", status: "Completed" },
  { id: "A010", date: "2026-03-25", patientId: "P003", doctorId: "D001", status: "Scheduled" },
];

export const bills: Bill[] = [
  { id: "B001", patientId: "P001", visitDate: "2026-03-12", amount: 250, status: "Paid" },
  { id: "B002", patientId: "P002", visitDate: "2026-03-18", amount: 480, status: "Unpaid" },
  { id: "B003", patientId: "P003", visitDate: "2026-03-10", amount: 150, status: "Paid" },
  { id: "B004", patientId: "P004", visitDate: "2026-03-15", amount: 620, status: "Pending" },
  { id: "B005", patientId: "P005", visitDate: "2026-02-28", amount: 320, status: "Paid" },
  { id: "B006", patientId: "P006", visitDate: "2026-03-10", amount: 890, status: "Unpaid" },
  { id: "B007", patientId: "P007", visitDate: "2026-03-05", amount: 175, status: "Paid" },
  { id: "B008", patientId: "P008", visitDate: "2026-03-01", amount: 540, status: "Pending" },
];

export const medicalRecords: MedicalRecord[] = [
  { id: "MR001", patientId: "P001", doctorId: "D001", date: "2026-03-12", diagnosis: "Hypertension Stage 1", notes: "Blood pressure 145/92. Started on Lisinopril 10mg. Follow-up in 2 weeks.", visitId: "V001" },
  { id: "MR002", patientId: "P001", doctorId: "D003", date: "2026-02-15", diagnosis: "Contact Dermatitis", notes: "Allergic reaction on forearms. Prescribed topical corticosteroid.", visitId: "V002" },
  { id: "MR003", patientId: "P001", doctorId: "D006", date: "2025-12-01", diagnosis: "Annual Physical", notes: "All vitals normal. Updated vaccinations. Recommended vitamin D supplement.", visitId: "V003" },
  { id: "MR004", patientId: "P002", doctorId: "D002", date: "2026-03-18", diagnosis: "Migraine with Aura", notes: "Recurring episodes 3x/week. MRI ordered. Started on Sumatriptan.", visitId: "V004" },
  { id: "MR005", patientId: "P002", doctorId: "D001", date: "2026-01-10", diagnosis: "Atrial Fibrillation", notes: "Irregular heartbeat detected. ECG confirms AFib. Anticoagulant prescribed.", visitId: "V005" },
  { id: "MR006", patientId: "P003", doctorId: "D003", date: "2026-03-10", diagnosis: "Eczema Flare-up", notes: "Chronic eczema on hands. Moisturizer regimen updated. Avoid triggers.", visitId: "V006" },
  { id: "MR007", patientId: "P004", doctorId: "D004", date: "2026-03-15", diagnosis: "Rotator Cuff Strain", notes: "Grade 2 strain, right shoulder. Physical therapy 3x/week for 6 weeks.", visitId: "V007" },
  { id: "MR008", patientId: "P005", doctorId: "D005", date: "2026-02-28", diagnosis: "Routine Pediatric Consult", notes: "Well-child visit. Growth on track. All immunizations current.", visitId: "V008" },
  { id: "MR009", patientId: "P006", doctorId: "D001", date: "2026-03-10", diagnosis: "Coronary Artery Disease", notes: "Stress test abnormal. Cardiac catheterization scheduled. Statin dose increased.", visitId: "V009" },
  { id: "MR010", patientId: "P007", doctorId: "D006", date: "2026-03-05", diagnosis: "Upper Respiratory Infection", notes: "Viral URI. Supportive care advised. Return if symptoms worsen in 7 days.", visitId: "V010" },
  { id: "MR011", patientId: "P008", doctorId: "D002", date: "2026-03-01", diagnosis: "Peripheral Neuropathy", notes: "Tingling in extremities. Nerve conduction study ordered. B12 supplementation started.", visitId: "V011" },
];

export const specializations = [...new Set(doctors.map(d => d.specialization))];

export const visitIds = medicalRecords.map(r => r.visitId);

// Helper: simulate JOIN
export function getJoinedAppointments() {
  return appointments.map(a => {
    const patient = patients.find(p => p.id === a.patientId)!;
    const doctor = doctors.find(d => d.id === a.doctorId)!;
    return {
      ...a,
      patientName: patient.name,
      doctorName: doctor.name,
      specialization: doctor.specialization,
    };
  });
}

export function getPatientRecords(patientId: string) {
  return medicalRecords
    .filter(r => r.patientId === patientId)
    .map(r => {
      const doctor = doctors.find(d => d.id === r.doctorId)!;
      return { ...r, doctorName: doctor.name };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
