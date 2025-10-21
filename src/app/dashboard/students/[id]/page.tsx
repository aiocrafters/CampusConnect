
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, where, getDoc, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import type { Student, StudentTimelineEvent, Exam, Subject, PerformanceRecord } from "@/lib/types";
import { ScrollText, ClipboardCheck, User, Mail, Phone, Calendar, Hash, Home, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PerformanceDetails extends PerformanceRecord {
  subjectName: string;
  maxMarks: number;
}


export default function StudentDetailPage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const studentId = params.id as string;
    
    const [isExamDetailOpen, setIsExamDetailOpen] = useState(false);
    const [examDetails, setExamDetails] = useState<Exam | null>(null);
    const [performanceDetails, setPerformanceDetails] = useState<PerformanceDetails[] | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const studentRef = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return doc(firestore, `schools/${user.uid}/students/${studentId}`);
    }, [user, firestore, studentId]);

    const timelineQuery = useMemoFirebase(() => {
        if (!user || !firestore || !studentId) return null;
        return query(collection(firestore, `schools/${user.uid}/students/${studentId}/timeline`), orderBy("timestamp", "desc"));
    }, [user, firestore, studentId]);

    const { data: student, isLoading: studentLoading } = useDoc<Student>(studentRef);
    const { data: timelineEvents, isLoading: timelineLoading } = useCollection<StudentTimelineEvent>(timelineQuery);

    const handleEventClick = async (event: StudentTimelineEvent) => {
        if (event.type !== 'EXAM_RESULT' || !event.details.examId || !firestore || !user) return;
        
        setIsExamDetailOpen(true);
        setIsLoadingDetails(true);
        setExamDetails(null);
        setPerformanceDetails(null);

        try {
            const examRef = doc(firestore, `schools/${user.uid}/exams`, event.details.examId);
            const examSnap = await getDoc(examRef);
            if (examSnap.exists()) {
                setExamDetails(examSnap.data() as Exam);
            }

            const subjectsRef = collection(firestore, `schools/${user.uid}/exams/${event.details.examId}/subjects`);
            const subjectsSnap = await getDocs(subjectsRef);
            const subjectsMap = new Map<string, Subject>();
            subjectsSnap.forEach(doc => subjectsMap.set(doc.id, doc.data() as Subject));

            const performanceRef = collection(firestore, `schools/${user.uid}/performanceRecords`);
            const q = query(performanceRef, 
                where('studentId', '==', studentId),
                where('examId', '==', event.details.examId)
            );
            const performanceSnap = await getDocs(q);
            
            const details: PerformanceDetails[] = [];
            performanceSnap.forEach(doc => {
                const record = doc.data() as PerformanceRecord;
                const subject = subjectsMap.get(record.subjectId);
                if (subject) {
                    details.push({
                        ...record,
                        subjectName: subject.subjectName,
                        maxMarks: subject.maxMarks
                    });
                }
            });
            setPerformanceDetails(details);

        } catch (error) {
            console.error("Error fetching exam details:", error);
            setExamDetails(null);
            setPerformanceDetails(null);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const renderIcon = (type: StudentTimelineEvent['type']) => {
        switch (type) {
            case 'ADMISSION':
                return <ScrollText className="w-5 h-5 text-primary" />;
            case 'PROMOTION':
                return <GraduationCap className="w-5 h-5 text-green-500" />;
            case 'EXAM_RESULT':
                 return <ClipboardCheck className="w-5 h-5 text-blue-500" />;
            default:
                return <ScrollText className="w-5 h-5 text-primary" />;
        }
    };
    
     const getPercentage = (marks: number, maxMarks: number) => {
        if (maxMarks === 0 || isNaN(marks) || isNaN(maxMarks)) return "N/A";
        return ((marks / maxMarks) * 100).toFixed(2) + "%";
    };

    const isLoading = studentLoading || timelineLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <p>Loading student details...</p>
            </div>
        );
    }
    
    if (!student) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Student Not Found</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>The requested student could not be found.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="w-6 h-6" /> {student.fullName}
                        </CardTitle>
                        <CardDescription>
                            Admission No: {student.admissionNumber}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <div className="flex items-start gap-3">
                            <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className={student.status === 'Active' ? 'bg-green-500 hover:bg-green-600' : ''}>
                              {student.status}
                            </Badge>
                             {student.status === 'Inactive' && <p className="text-muted-foreground text-xs">({student.inactiveReason})</p>}
                        </div>
                         <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span><strong>DOB:</strong> {student.dateOfBirth}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Admission Class:</strong> {student.admissionClass}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Current Class:</strong> {student.currentClass}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Father:</strong> {student.parentGuardianName}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Mother:</strong> {student.motherName || 'N/A'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all"><strong>Address:</strong> {student.address}</span>
                        </div>
                        <Separator />
                        <h4 className="font-semibold">Additional Information</h4>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>PEN:</strong> {student.pen || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Aadhar:</strong> {student.aadhaarNumber || 'N/A'}</span>
                        </div>
                         <Separator />
                        <h4 className="font-semibold">Bank Details</h4>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Account No:</strong> {student.bankAccountNumber || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>Bank Name:</strong> {student.bankName || 'N/A'}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <span><strong>IFSC:</strong> {student.ifscCode || 'N/A'}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Timeline</CardTitle>
                        <CardDescription>
                            An overview of the student's academic journey and important events.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pl-6">
                            <div className="absolute left-[34px] h-full w-0.5 bg-border -translate-x-1/2"></div>
                            
                            <div className="space-y-8">
                                {timelineEvents && timelineEvents.length > 0 ? (
                                    timelineEvents.map((event) => (
                                    <div key={event.id} className="relative flex items-start">
                                        <div className="flex-shrink-0 w-16 text-right pr-6">
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(event.timestamp), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 z-10">
                                            <div className={`w-4 h-4 rounded-full mt-1 ${event.type === 'EXAM_RESULT' ? 'bg-blue-500' : 'bg-primary'}`}></div>
                                        </div>
                                        <div className="ml-6 flex-1">
                                            <div className="flex items-center gap-2">
                                                {renderIcon(event.type)}
                                                <h4 className="font-semibold">{event.type.replace(/_/g, ' ')}</h4>
                                            </div>
                                            <p 
                                              className={`mt-1 text-sm ${event.type === 'EXAM_RESULT' ? 'text-blue-600 dark:text-blue-400 cursor-pointer hover:underline' : 'text-muted-foreground'}`}
                                              onClick={() => handleEventClick(event)}
                                            >
                                                {event.description}
                                            </p>
                                        </div>
                                    </div>
                                    ))
                                ) : (
                                    <p>No timeline events found for this student.</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isExamDetailOpen} onOpenChange={setIsExamDetailOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            Exam Performance: {examDetails?.examName} ({examDetails?.year})
                        </DialogTitle>
                        <DialogDescription>
                            Detailed report for {student?.fullName} in Class {examDetails?.className}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {isLoadingDetails ? (
                            <p>Loading details...</p>
                        ) : performanceDetails ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject Name</TableHead>
                                        <TableHead>Maximum Marks</TableHead>
                                        <TableHead>Marks Obtained</TableHead>
                                        <TableHead>Percentage</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {performanceDetails.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.subjectName}</TableCell>
                                            <TableCell>{record.maxMarks}</TableCell>
                                            <TableCell>{record.marks}</TableCell>
                                            <TableCell>{getPercentage(record.marks, record.maxMarks)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p>Could not load performance details for this exam.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExamDetailOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
