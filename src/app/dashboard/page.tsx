
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy, where, getDocs } from "firebase/firestore"
import { Users, BookUser, School, ClipboardList } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Student, Teacher, ClassSection, Exam, Subject } from "@/lib/types";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns"
import { errorEmitter, FirestorePermissionError } from "@/firebase";


export default function Dashboard() {
  const { user, isUserLoading, firestore } = useFirebase();

  const schoolId = user?.uid;

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isExamDetailDialogOpen, setIsExamDetailDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // --- Data Fetching ---
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`), orderBy("admissionNumber", "desc"), limit(5));
  }, [firestore, schoolId]);

  const allStudentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return collection(firestore, `schools/${schoolId}/students`);
  }, [firestore, schoolId]);

  const teachersQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return collection(firestore, `schools/${schoolId}/teachers`);
  }, [firestore, schoolId]);

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return collection(firestore, `schools/${schoolId}/classSections`);
  }, [firestore, schoolId]);

  const examsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId || !selectedClass) return null;
    return query(
      collection(firestore, `schools/${schoolId}/exams`),
      where("year", "==", selectedYear),
      where("className", "==", selectedClass)
    );
  }, [firestore, schoolId, selectedYear, selectedClass]);
  

  const { data: recentStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: allStudents, isLoading: allStudentsLoading } = useCollection<Student>(allStudentsQuery);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);
  const { data: allClassSections, isLoading: classesLoading } = useCollection<ClassSection>(classesQuery);
  const { data: exams, isLoading: examsLoading } = useCollection<Exam>(examsQuery);

  const stats = [
    { title: "Total Students", value: allStudents?.length ?? 0, icon: Users, isLoading: allStudentsLoading },
    { title: "Total Teachers", value: teachers?.length ?? 0, icon: BookUser, isLoading: teachersLoading },
    { title: "Class Rooms / Sections", value: allClassSections?.length ?? 0, icon: School, isLoading: classesLoading },
    { title: "Exams Conducted", value: exams?.length ?? 0, icon: ClipboardList, isLoading: examsLoading && !!selectedClass},
  ]
  
  const getTeacherName = (teacherId?: string) => {
    if (!teachers || !teacherId) return "Not Assigned";
    return teachers.find(t => t.id === teacherId)?.name || "Not Assigned";
  };
  
  const classOptions = ["UKG", ...Array.from({ length: 12 }, (_, i) => `${i + 1}`)];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  const handleViewExamDetails = async (exam: Exam) => {
    setSelectedExam(exam);
    setIsExamDetailDialogOpen(true);
    setSubjectsLoading(true);

    if (!firestore || !schoolId) return;

    const subjectsPath = `schools/${schoolId}/exams/${exam.id}/subjects`;
    const subjectsQuery = query(collection(firestore, subjectsPath));
    
    try {
        const querySnapshot = await getDocs(subjectsQuery);
        const subjectsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Subject));
        setSubjects(subjectsData);
    } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: subjectsPath,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setSubjectsLoading(false);
    }
  };


  if (isUserLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.displayName || 'Admin'}!</h1>
        <p className="text-muted-foreground">Here's an overview of your school's activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
            <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {stat.isLoading ? <div className="text-2xl font-bold animate-pulse">...</div> : <div className="text-2xl font-bold">{stat.value}</div>}
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Recent Student Admissions</CardTitle>
                <CardDescription>A list of the 5 most recently added students.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentsLoading && Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ))}
                        {recentStudents && recentStudents.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell className="font-medium">{student.fullName}</TableCell>
                                <TableCell>{student.parentGuardianName}</TableCell>
                                <TableCell>
                                    <Badge variant={'default'} className="bg-green-500 hover:bg-green-600 dark:bg-green-700 dark:hover:bg-green-800 text-white dark:text-white">
                                        Active
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                         {recentStudents?.length === 0 && !studentsLoading && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">No recent students found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Sections Overview</CardTitle>
                <CardDescription>A summary of all class sections and their incharges.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Section Name</TableHead>
                            <TableHead>Section Incharge</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(classesLoading || teachersLoading) && Array.from({length: 5}).map((_, i) => (
                             <TableRow key={i}>
                                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ))}
                        {allClassSections && allClassSections.map((section) => (
                            <TableRow key={section.id}>
                                <TableCell className="font-medium">{section.className}</TableCell>
                                <TableCell>{section.sectionIdentifier}</TableCell>
                                <TableCell>{section.sectionName || '-'}</TableCell>
                                <TableCell>{getTeacherName(section.sectionInchargeId)}</TableCell>
                            </TableRow>
                        ))}
                         {allClassSections?.length === 0 && !classesLoading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">No sections found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

       <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Exams Overview</CardTitle>
            <CardDescription>
              Filter exams by year and class to see details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Select onValueChange={(value) => setSelectedYear(Number(value))} defaultValue={selectedYear.toString()}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setSelectedClass} value={selectedClass || ''}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map(c => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examsLoading && (
                    <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>
                  )}
                  {!examsLoading && !selectedClass && (
                    <TableRow><TableCell colSpan={4} className="text-center">Please select a class to view exams.</TableCell></TableRow>
                  )}
                  {!examsLoading && selectedClass && exams && exams.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center">No exams found for the selected criteria.</TableCell></TableRow>
                  )}
                  {!examsLoading && exams && exams.map(exam => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.examName}</TableCell>
                      <TableCell>{exam.className}</TableCell>
                      <TableCell>{exam.year}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewExamDetails(exam)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

       <Dialog open={isExamDetailDialogOpen} onOpenChange={setIsExamDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Exam Details: {selectedExam?.examName} ({selectedExam?.year})</DialogTitle>
                <DialogDescription>
                    Subjects and schedule for Class {selectedExam?.className}.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Teacher</TableHead>
                          <TableHead>Max Marks</TableHead>
                          <TableHead>Exam Date</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {subjectsLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading subjects...</TableCell></TableRow>}
                      {!subjectsLoading && subjects && subjects.length > 0 && subjects.map(subject => (
                          <TableRow key={subject.id}>
                              <TableCell>{subject.subjectName}</TableCell>
                              <TableCell>{getTeacherName(subject.teacherId)}</TableCell>
                              <TableCell>{subject.maxMarks}</TableCell>
                              <TableCell>{format(new Date(subject.examDate), "PPP")}</TableCell>
                          </TableRow>
                      ))}
                       {!subjectsLoading && (!subjects || subjects.length === 0) && (
                          <TableRow><TableCell colSpan={4} className="text-center">No subjects found for this exam.</TableCell></TableRow>
                       )}
                  </TableBody>
              </Table>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsExamDetailDialogOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

    