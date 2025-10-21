
"use client"

import {
  File,
  Search,
  MoreHorizontal,
  View
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import type { Student, ClassSection } from "@/lib/types"

import { useRouter } from "next/navigation"

export default function StudentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const router = useRouter();
  
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/students`));
  }, [firestore, schoolId]);

  const classSectionsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/classSections`));
  }, [firestore, schoolId]);

  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery);
  const { data: classSections } = useCollection<ClassSection>(classSectionsQuery);


  const getSectionDetails = (sectionId?: string) => {
    if (!classSections || !sectionId) return { className: "N/A", sectionIdentifier: "" };
    const section = classSections.find(s => s.id === sectionId);
    return section 
      ? { className: section.className, sectionIdentifier: section.sectionIdentifier } 
      : { className: "Not Assigned", sectionIdentifier: "" };
  };

  const handleView = (student: Student) => {
    router.push(`/dashboard/students/${student.id}`);
  };

  return (
    <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
      <Tabs defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            
          </div>
        </div>
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                Manage all students in your school.
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by name, ID, or UDISE code..." className="pl-8 sm:w-1/2 md:w-1/3" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Admission Date</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Admission Class</TableHead>
                    <TableHead>Current Class</TableHead>
                    <TableHead>Current Section</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Mother's Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>PEN</TableHead>
                    <TableHead>Aadhar</TableHead>
                    <TableHead>Bank Acc No.</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>IFSC</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsLoading && (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center">
                        Loading student data...
                      </TableCell>
                    </TableRow>
                  )}
                  {!studentsLoading && students?.length === 0 && (
                     <TableRow>
                      <TableCell colSpan={18} className="text-center">
                        No students found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {students && students.map(student => {
                    const { className, sectionIdentifier } = getSectionDetails(student.classSectionId);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium truncate max-w-[100px]">{student.id}</TableCell>
                        <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                        <TableCell>{student.fullName}</TableCell>
                        <TableCell>
                           <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className={student.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {student.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{student.admissionDate}</TableCell>
                        <TableCell>{student.dateOfBirth}</TableCell>
                        <TableCell>{student.admissionClass}</TableCell>
                        <TableCell>{student.currentClass || className}</TableCell>
                        <TableCell>{sectionIdentifier}</TableCell>
                        <TableCell>{student.parentGuardianName}</TableCell>
                        <TableCell>{student.motherName}</TableCell>
                        <TableCell className="truncate max-w-xs">{student.address}</TableCell>
                        <TableCell>{student.pen}</TableCell>
                        <TableCell>{student.aadhaarNumber}</TableCell>
                        <TableCell>{student.bankAccountNumber}</TableCell>
                        <TableCell>{student.bankName}</TableCell>
                        <TableCell>{student.ifscCode}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleView(student)}>
                                <View className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
