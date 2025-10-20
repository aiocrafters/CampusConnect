import type { User, Student, Teacher, SchoolClass } from './types';

export const mockUser: User = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@prestige.edu',
  role: 'admin',
  avatarUrl: 'https://picsum.photos/seed/avatar1/100/100'
};

export const mockStudents: Student[] = [
  { id: 'STU-001', admissionNumber: '2023001', udiseCode: '12345', name: 'Aarav Sharma', dob: '15-05-2010', parentName: 'Rakesh Sharma', class: 'Grade 5', section: 'A', status: 'Active' },
  { id: 'STU-002', admissionNumber: '2023002', udiseCode: '12345', name: 'Sanya Verma', dob: '22-08-2010', parentName: 'Sunita Verma', class: 'Grade 5', section: 'A', status: 'Active' },
  { id: 'STU-003', admissionNumber: '2023003', udiseCode: '12345', name: 'Rohan Mehta', dob: '10-01-2010', parentName: 'Anil Mehta', class: 'Grade 5', section: 'B', status: 'Active' },
  { id: 'STU-004', admissionNumber: '2023004', udiseCode: '12345', name: 'Priya Singh', dob: '30-11-2010', parentName: 'Manoj Singh', class: 'Grade 5', section: 'B', status: 'Inactive' },
  { id: 'STU-005', admissionNumber: '2023005', udiseCode: '12345', name: 'Vikram Reddy', dob: '05-07-2009', parentName: 'Laxmi Reddy', class: 'Grade 6', section: 'A', status: 'Active' },
  { id: 'STU-006', admissionNumber: '2023006', udiseCode: '12345', name: 'Isha Gupta', dob: '18-03-2009', parentName: 'Rajesh Gupta', class: 'Grade 6', section: 'A', status: 'Active' },
];

export const mockTeachers: Teacher[] = [
    { id: 'TCH-01', name: 'Mrs. Anjali Kapoor', contact: '9876543210', assignedClasses: [{ class: 'Grade 5', section: 'A', subject: 'Mathematics' }] },
    { id: 'TCH-02', name: 'Mr. Sameer Khan', contact: '9876543211', assignedClasses: [{ class: 'Grade 5', section: 'B', subject: 'Science' }] },
    { id: 'TCH-03', name: 'Ms. Divya Desai', contact: '9876543212', assignedClasses: [{ class: 'Grade 6', section: 'A', subject: 'English' }] },
];

export const mockClasses: SchoolClass[] = [
    { id: 'CLS-01', name: 'Grade 5', incharge: 'Mrs. Anjali Kapoor', sections: [{ id: 'SEC-A', name: 'A', studentCount: 35 }, { id: 'SEC-B', name: 'B', studentCount: 32 }] },
    { id: 'CLS-02', name: 'Grade 6', incharge: 'Ms. Divya Desai', sections: [{ id: 'SEC-A', name: 'A', studentCount: 40 }] },
    { id: 'CLS-03', name: 'Grade 7', incharge: 'Mr. Vijay Kumar', sections: [{ id: 'SEC-A', name: 'A', studentCount: 38 }, { id: 'SEC-B', name: 'B', studentCount: 37 }] },
];
