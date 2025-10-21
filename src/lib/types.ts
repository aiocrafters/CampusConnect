

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

export interface ClassSection {
  id: string;
  schoolId: string;
  className: string;
  sectionIdentifier: string;
  sectionName?: string;
  sectionInchargeId?: string;
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

export interface StudentTimelineEvent {
    id: string;
    studentId: string;
    timestamp: string;
    type: 'ADMISSION' | 'PROMOTION';
    description: string;
    details: {
        class?: string;
        section?: string;
        academicYear?: string;
    };
}

export interface Promotion {
    id: string;
    schoolId: string;
    academicYear: string;
    fromClassSectionId: string;
    toClassSectionId: string;
    studentIds: string[];
    promotionDate: string;
}
    
