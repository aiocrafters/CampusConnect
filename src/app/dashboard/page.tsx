
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
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy } from "firebase/firestore"
import { Users, BookUser, School, ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Student, Teacher } from "@/lib/types";

interface ClassSection {
  id: string;
  className: string;
  sectionName: string;
  sectionInchargeId?: string;
}


export default function Dashboard() {
  const { user, isUserLoading, firestore } = useFirebase();

  const schoolId = user?.uid;

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

  const { data: recentStudents, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: allStudents, isLoading: allStudentsLoading } = useCollection<Student>(allStudentsQuery);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Teacher>(teachersQuery);
  const { data: allClassSections, isLoading: classesLoading } = useCollection<ClassSection>(classesQuery);
  
  // For now, pending queries are hardcoded as it requires more complex logic
  const pendingQueries = 0;

  const stats = [
    { title: "Total Students", value: allStudents?.length ?? 0, icon: Users, isLoading: allStudentsLoading },
    { title: "Total Teachers", value: teachers?.length ?? 0, icon: BookUser, isLoading: teachersLoading },
    { title: "Class Rooms / Sections", value: allClassSections?.length ?? 0, icon: School, isLoading: classesLoading },
    { title: "Pending Queries", value: pendingQueries, icon: ClipboardCheck, isLoading: false },
  ]
  
  const getTeacherName = (teacherId?: string) => {
    if (!teachers || !teacherId) return "Not Assigned";
    return teachers.find(t => t.id === teacherId)?.name || "Not Assigned";
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
                            <TableHead>Section Incharge</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(classesLoading || teachersLoading) && Array.from({length: 5}).map((_, i) => (
                             <TableRow key={i}>
                                <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                            </TableRow>
                        ))}
                        {allClassSections && allClassSections.map((section) => (
                            <TableRow key={section.id}>
                                <TableCell className="font-medium">{section.className}</TableCell>
                                <TableCell>{section.sectionName}</TableCell>
                                <TableCell>{getTeacherName(section.sectionInchargeId)}</TableCell>
                            </TableRow>
                        ))}
                         {allClassSections?.length === 0 && !classesLoading && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center">No sections found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}

    