"use client";

import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PlusCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

const departmentFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Department name is required."),
  type: z.enum(["Academic", "Non-Academic", "Vocational"], {
    required_error: "Department type is required.",
  }),
  parentId: z.string().optional(),
  customName: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  form: ReturnType<typeof useForm<DepartmentFormData>>;
  onSubmit: (values: DepartmentFormData) => void;
  parentDepartments: { value: string; label: string }[];
  isLoading: boolean;
}

// Subordinate department lists
const subDepartments = {
    'Academic Affairs Department': ["Kindergarten Section (Pre-Primary Wing)", "Primary Section (Classes 1–5)", "Middle Section (Classes 6–8)", "Secondary Section (Classes 9–10)", "Higher Secondary Section (Classes 11–12)", "Examination", "Curriculum Development", "Teacher Coordination and Supervision", "Custom Name"],
    'Language and Literature Department': ["English Language", "Literature and Creative Writing", "Foreign Languages (French, Spanish, Chinese, Arabic, etc.)", "Custom Name"],
    'Mathematics Department': ["Elementary Mathematics", "Secondary Mathematics", "Applied Mathematics / Statistics", "Custom Name"],
    'Science Department': ["Physics", "Chemistry", "Biology", "Environmental Science", "Laboratory Management", "Custom Name"],
    'Social Studies and Humanities Department': ["History", "Geography", "Civics and Government", "Economics", "Custom Name"],
    'Arts and Physical Education Department': ["Music", "Visual Arts", "Drama and Performing Arts", "Physical Education (P.E.)", "Health Education", "Custom Name"],
    'Computer Science / ICT Department': ["Computer Literacy", "Programming and Web Development", "Network and Systems", "Educational Technology Integration", "Custom Name"],
    'Business and Technical Education Department': ["Business Studies", "Accounting and Finance", "Entrepreneurship", "Technical and Vocational Training", "Custom Name"],
    'Technical and Vocational Skills Department': ["Carpentry and Woodwork", "Electronics and Mechanics", "Hospitality and Tourism", "Agriculture and Horticulture", "Custom Name"],
    'School Administration Department': ["Principal’s", "Vice Principal’s", "Academic Affairs Coordination", "Policy and Planning", "Custom Name"],
    'Human Resources (HR) Department': ["Recruitment", "Staff Development and Training", "Employee Welfare and Evaluation", "Custom Name"],
    'Finance and Accounting Department': ["Budget", "Payroll", "Procurement and Supplies", "Audit and Compliance", "Custom Name"],
    'Admissions and Records Department': ["Student Admissions", "Registrar’s (Records and Transcripts)", "Enrollment Data Management", "Custom Name"],
    'Student Affairs and Guidance Department': ["Student Discipline", "Counseling and Guidance", "Career Development", "Extracurricular and Clubs", "Parent and Community Relations", "Custom Name"],
    'Information Technology (IT) Department': ["IT Infrastructure and Network", "Technical Support", "Data Security and Systems Management", "Custom Name"],
    'Facilities and Maintenance Department': ["Building Maintenance", "Grounds and Utilities", "Security", "Transportation and Logistics", "Custom Name"],
    'Health and Wellness Department': ["School Clinic / Nurse’s", "Health Education", "Safety and Emergency Response", "Custom Name"],
};

type ParentDepartmentKey = keyof typeof subDepartments;

export const DepartmentForm: React.FC<DepartmentFormProps> = ({ form, onSubmit, parentDepartments, isLoading }) => {
  const parentId = useWatch({
    control: form.control,
    name: 'parentId',
  });
  
  const departmentName = useWatch({
    control: form.control,
    name: 'name',
  });

  const subordinateOptions = parentId ? subDepartments[parentId as ParentDepartmentKey] : null;
  const isCustomName = departmentName === 'Custom Name';

   const modifiedOnSubmit = (values: DepartmentFormData) => {
    if (values.name === 'Custom Name' && values.customName) {
      onSubmit({ ...values, name: values.customName });
    } else {
      onSubmit(values);
    }
  };

  useEffect(() => {
    if (parentId && !subordinateOptions) {
      form.setValue('name', '');
    }
  }, [parentId, subordinateOptions, form]);
  
  return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(modifiedOnSubmit)} className="space-y-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Parent Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a parent department" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {parentDepartments.map(dept => (
                        <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            {subordinateOptions ? (
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Subordinate Department / Unit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a unit" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {subordinateOptions.map(deptName => (
                                        <SelectItem key={deptName} value={deptName}>{deptName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Department Name</FormLabel>
                        <FormControl>
                        <Input placeholder="Enter department name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
        </div>
        {isCustomName && (
            <FormField
                control={form.control}
                name="customName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Custom Department Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter the custom department name" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Department
            </Button>
        </div>
    </form>
  </Form>
  )
};
