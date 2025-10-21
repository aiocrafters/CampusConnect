
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirebase, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import { doc, collection, query, orderBy, where, getDoc, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import type { Student, StudentTimelineEvent, Exam, Subject, PerformanceRecord } from "@/lib/types";
import { ScrollText, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


interface PerformanceDetails extends PerformanceRecord {
  subjectName: string;
  maxMarks: number;
}


export default function StudentTimelinePage() {
    const { user, firestore } = useFirebase();
    const params = useParams();
    const studentId = params.id as string;
    
    const [selectedEvent, setSelectedEvent] = useState<StudentTimelineEvent | null>(null);
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
        
        setSelectedEvent(event);
        setIsExamDetailOpen(true);
        setIsLoadingDetails(true);

        try {
            // Fetch Exam Details
            const examRef = doc(firestore, `schools/${user.uid}/exams`, event.details.examId);
            const examSnap = await getDoc(examRef);
            if (examSnap.exists()) {
                setExamDetails(examSnap.data() as Exam);
            }

            // Fetch Subjects for the Exam
            const subjectsRef = collection(firestore, `schools/${user.uid}/exams/${event.details.examId}/subjects`);
            const subjectsSnap = await getDocs(subjectsRef);
            const subjectsMap = new Map<string, Subject>();
            subjectsSnap.forEach(doc => subjectsMap.set(doc.id, doc.data() as Subject));

            // Fetch Performance Records for the student for that exam
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
            case 'PROMOTION':
                return <ScrollText className="w-5 h-5 text-primary" />;
            case 'EXAM_RESULT':
                 return <ClipboardCheck className="w-5 h-5 text-blue-500" />;
            default:
                return <ScrollText className="w-5 h-5 text-primary" />;
        }
    };
    
     const getPercentage = (marks: number, maxMarks: number) => {
        if (maxMarks === 0) return "N/A";
        return ((marks / maxMarks) * 100).toFixed(2) + "%";
    };

    const isLoading = studentLoading || timelineLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Student Timeline: {studentLoading ? '...' : student?.fullName}</CardTitle>
                <CardDescription>
                    An overview of the student's academic journey and important events.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p>Loading timeline...</p>
                ) : (
                    <div className="relative pl-6">
                        {/* Vertical line */}
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
                                            <h4 className="font-semibold">{event.type.replace('_', ' ')}</h4>
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
                )}
            </CardContent>

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
                            <p>Could not load performance details.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExamDetailOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

    