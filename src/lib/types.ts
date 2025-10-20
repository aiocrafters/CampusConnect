
export type UserRole = "admin" | "teacher" | "incharge" | "student" | "parent";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
}

export interface Student {
  id: string; 
  admissionNumber: string;
  udiseCode: string;
  fullName: string;
  dateOfBirth: string; 
  parentGuardianName: string;
  classSectionId: string;
  address: string;
  aadhaarNumber?: string;
  status: 'Active' | 'Inactive';
  pen?: string;
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
}

export interface Teacher {
  id: string;
  name: string;
  contactDetails: string;
  schoolId: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  incharge: string;
  sections: { id: string, name: string, studentCount: number }[];
}

export interface Exam {
  id: string;
  name: string;
  date: string;
  class: string;
}
