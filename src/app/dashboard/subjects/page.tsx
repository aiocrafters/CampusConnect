"use client"

import { useMemo } from "react"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collectionGroup, query, where } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Teacher } from "@/lib/types"

interface Subject {
    id: string;
    examId: string;
    schoolId: string;
    subjectName: string;
    teacherId: string;
    maxMarks: number;
}

interface Exam {
  id: string;
  examName: string;
  classSectionId: string;
  schoolId: string;
}

interface ClassSection {
  id: string;
  className: string;
  sectionName: string;
  schoolId: string;
}

export default function SubjectsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;

  // Data fetching
  const subjectsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collectionGroup(firestore, 'subjects'), where('schoolId', '==', schoolId));
  }, [firestore, schoolId]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Subject>(subjectsQuery);
  
  const examsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/exams`));
  }, [firestore, schoolId]);
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsQuery);
  
  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collectionGroup(firestore, 'classSections'), where('schoolId', '==', schoolId));
  }, [firestore, schoolId]);
  const { data: classSections, isLoading: classSectionsLoading } = useCollection<ClassSection>(classSectionsQuery);
  
  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/teachers`));
  }, [firestore, schoolId]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);

  const getExamName = (examId: string) => {
    return exams?.find(e => e.id === examId)?.examName || "Unknown Exam";
  };
  
  const getClassDetails = (examId: string) => {
    const exam = exams?.find(e => e.id === examId);
    if (!exam) return "N/A";
    const section = classSections?.find(s => s.id === exam.classSectionId);
    if (!section) return "N/A";
    return `Class ${section.className} - ${section.sectionName}`;
  };

  const getTeacherName = (teacherId: string) => {
    return teachers?.find(t => t.id === teacherId)?.name || "Unknown Teacher";
  };
  
  const isLoading = subjectsLoading || examsLoading || classSectionsLoading || teachersLoading;

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
          <CardDescription>
            A comprehensive list of all subjects across all classes and exams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject Name</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Class & Section</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Max Marks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading subjects...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && subjects?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No subjects found in the system.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && subjects?.map(subject => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.subjectName}</TableCell>
                  <TableCell>{getExamName(subject.examId)}</TableCell>
                  <TableCell>{getClassDetails(subject.examId)}</TableCell>
                  <TableCell>{getTeacherName(subject.teacherId)}</TableCell>
                  <TableCell>{subject.maxMarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
