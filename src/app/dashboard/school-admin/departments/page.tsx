"use client"

import { useState, useMemo } from "react";
import { useFirebase, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Department } from "@/lib/types";
import { DepartmentForm } from "./DepartmentForm";

const departmentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name is required."),
  type: z.enum(["Academic", "Non-Academic", "Vocational"], {
    required_error: "Department type is required.",
  }),
  parentId: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

export default function DepartmentsPage() {
  const { user, firestore } = useFirebase();
  const schoolId = user?.uid;
  const { toast } = useToast();

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const departmentsQuery = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return query(collection(firestore, `schools/${schoolId}/departments`));
  }, [firestore, schoolId]);
  const { data: departments, isLoading: departmentsLoading } = useCollection<Department>(departmentsQuery);

  const academicForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", type: "Academic", parentId: "Academic Affairs" },
  });
  const vocationalForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", type: "Vocational", parentId: "Business and Technical Education Department" },
  });
  const nonAcademicForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", type: "Non-Academic", parentId: "School Administration Department" },
  });

  // Parent department options
  const academicParents = [
    { value: "Language and Literature Department", label: "Language and Literature Department" },
    { value: "Mathematics Department", label: "Mathematics Department" },
    { value: "Science Department", label: "Science Department" },
    { value: "Social Studies and Humanities Department", label: "Social Studies and Humanities Department" },
    { value: "Arts and Physical Education Department", label: "Arts and Physical Education Department" },
    { value: "Computer Science and ICT Department", label: "Computer Science and ICT Department" },
    { value: "Academic Affairs", label: "Academic Affairs" },
  ];
  const vocationalParents = [
    { value: "Business and Technical Education Department", label: "Business and Technical Education Department" },
    { value: "Technical and Vocational Skills Department", label: "Technical and Vocational Skills Department" },
  ];
  const nonAcademicParents = [
    { value: "School Administration Department", label: "School Administration Department" },
    { value: "Human Resources (HR) Department", label: "Human Resources (HR) Department" },
    { value: "Finance and Accounting Department", label: "Finance and Accounting Department" },
    { value: "Admissions and Records Department", label: "Admissions and Records Department" },
    { value: "Student Affairs and Guidance Department", label: "Student Affairs and Guidance Department" },
    { value: "Information Technology (IT) Department", label: "Information Technology (IT) Department" },
    { value: "Facilities and Maintenance Department", label: "Facilities and Maintenance Department" },
    { value: "Health and Wellness Department", label: "Health and Wellness Department" },
  ];
  
  const allParentOptions = useMemo(() => {
    const dynamicParents = departments?.filter(d => !d.parentId).map(d => ({ value: d.id, label: d.name })) || [];
    return [...academicParents, ...vocationalParents, ...nonAcademicParents, ...dynamicParents];
  },[departments]);


  const getParentName = (parentId?: string) => {
    if (!parentId) return "Top-Level";
    const parent = allParentOptions.find(p => p.value === parentId);
    return parent?.label || "Top-Level";
  };
  
  const handleDepartmentSubmit = (values: DepartmentFormData) => {
    if (!firestore || !schoolId) return;

    const departmentId = doc(collection(firestore, `schools/${schoolId}/departments`)).id;
    const departmentRef = doc(firestore, `schools/${schoolId}/departments`, departmentId);

    const data: Omit<Department, 'isDefault'> = {
      id: departmentId,
      schoolId: schoolId,
      name: values.name,
      type: values.type,
      parentId: values.parentId,
    };

    setDocumentNonBlocking(departmentRef, data, { merge: false });
    toast({ title: "Department Created", description: `${values.name} has been added.` });
    
    // Reset the correct form
    if(values.type === 'Academic') academicForm.reset();
    if(values.type === 'Vocational') vocationalForm.reset();
    if(values.type === 'Non-Academic') nonAcademicForm.reset();
  };
  
  const handleDelete = (department: Department) => {
     setSelectedDepartment(department);
     setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (!firestore || !schoolId || !selectedDepartment) return;
    
    const childDepartments = departments?.filter(d => d.parentId === selectedDepartment.id);
    if (childDepartments && childDepartments.length > 0) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Department",
            description: "This department has sub-departments. Please delete or reassign them first.",
        });
        setIsDeleteDialogOpen(false);
        return;
    }

    deleteDocumentNonBlocking(doc(firestore, `schools/${schoolId}/departments`, selectedDepartment.id));
    toast({ variant: "destructive", title: "Department Deleted" });
    setIsDeleteDialogOpen(false);
    setSelectedDepartment(null);
  };

  return (
    <main className="grid flex-1 items-start gap-8 sm:px-6 sm:py-0">
        <Card>
            <CardHeader>
                <CardTitle>Add New Department</CardTitle>
                <CardDescription>Select the department type to add a new department.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="academic">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="academic">Academic</TabsTrigger>
                        <TabsTrigger value="vocational">Vocational</TabsTrigger>
                        <TabsTrigger value="non-academic">Non-Academic</TabsTrigger>
                    </TabsList>
                    <TabsContent value="academic">
                        <Card className="mt-4">
                            <CardHeader><CardTitle>Add Academic Department</CardTitle></CardHeader>
                            <CardContent>
                                <DepartmentForm form={academicForm} onSubmit={handleDepartmentSubmit} parentDepartments={academicParents} isLoading={departmentsLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="vocational">
                        <Card className="mt-4">
                            <CardHeader><CardTitle>Add Vocational Department</CardTitle></CardHeader>
                            <CardContent>
                                <DepartmentForm form={vocationalForm} onSubmit={handleDepartmentSubmit} parentDepartments={vocationalParents} isLoading={departmentsLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="non-academic">
                         <Card className="mt-4">
                            <CardHeader><CardTitle>Add Non-Academic Department</CardTitle></CardHeader>
                            <CardContent>
                                <DepartmentForm form={nonAcademicForm} onSubmit={handleDepartmentSubmit} parentDepartments={nonAcademicParents} isLoading={departmentsLoading} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>

      <Card>
        <CardHeader>
            <CardTitle>Departments & Offices</CardTitle>
            <CardDescription>Manage academic and non-academic departments and their sub-departments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Department Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departmentsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading departments...</TableCell>
                </TableRow>
              )}
               {!departmentsLoading && departments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No departments created yet. Add one to get started.</TableCell>
                </TableRow>
              )}
              {departments && departments.map((dept, index) => (
                <TableRow key={dept.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell>{dept.type}</TableCell>
                  <TableCell>{getParentName(dept.parentId)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>This will permanently delete the department "{selectedDepartment?.name}". This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive" onClick={confirmDelete}>Yes, delete department</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
