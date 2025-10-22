

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
  admissionClass?: string;
  currentClass: string;
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
  role: string;
  schoolId: string;
  uid?: string;
  designationId?: string;
  departmentId?: string;
  status: 'Active' | 'Inactive';
  inactiveReason?: string;
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
  schoolId: string;
  examName: string;
  className: string;
  year: number;
}

export interface Subject {
    id: string;
    examId: string;
    subjectName: string;
    teacherId: string;
    maxMarks: number;
    examDate: string;
    schoolId: string;
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
    type: 'ADMISSION' | 'PROMOTION' | 'EXAM_RESULT' | 'CLASS_ASSIGNMENT';
    description: string;
    details: {
        class?: string;
        section?: string;
        academicYear?: string;
        examId?: string;
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

export interface PerformanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  examId: string;
  schoolId: string;
  marks: number;
  remarks?: string;
}
    
export interface Designation {
  id: string;
  schoolId: string;
  name: string;
}
    
export interface Department {
  id: string;
  schoolId: string;
  name: string;
  parentId?: string;
  isDefault?: boolean;
  type?: 'Academic' | 'Non-Academic';
}
    

    

    

    

    

    