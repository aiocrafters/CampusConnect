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
  name: string;
  dob: string; 
  parentName: string;
  class: string;
  section: string;
  status: 'Active' | 'Inactive';
}

export interface Teacher {
  id: string;
  name: string;
  contact: string;
  assignedClasses: { class: string; section: string; subject: string }[];
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
