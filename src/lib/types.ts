

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
  schoolId: string;
  admissionNumber: string;
  admissionDate: string;
  fullName: string;
  dateOfBirth: string; 
  parentGuardianName: string;
  motherName?: string;
  admissionClass: string;
  classSectionId: string;
  address: string;
  aadhaarNumber?: string;
  status: 'Active' | 'Inactive';
  inactiveReason?: string;
  pen?: string;
  bankAccountNumber?: string;
  bankName?: string;
  ifscCode?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  qualification: string;
  address: string;
  dateOfJoining: string;
  role: 'Primary' | 'Middle School' | 'High School';
  subject: 'General' | 'English' | 'Urdu' | 'Math' | 'Science' | 'Social Studies';
  schoolId: string;
  uid?: string;
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

export interface MasterSubject {
  id: string;
  schoolId: string;
  subjectName: string;
}

    
