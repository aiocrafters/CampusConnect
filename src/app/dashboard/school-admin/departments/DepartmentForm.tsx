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

const academicAffairsDepartments = [
    "Kindergarten Section (Pre-Primary Wing)",
    "Primary Section (Classes 1–5)",
    "Middle Section (Classes 6–8)",
    "Secondary Section (Classes 9–10)",
    "Higher Secondary Section (Classes 11–12)",
    "Examination Office",
    "Curriculum Development Office",
    "Teacher Coordination and Supervision Office",
    "Custom Name",
];


export const DepartmentForm: React.FC<DepartmentFormProps> = ({ form, onSubmit, parentDepartments, isLoading }) => {
  const parentId = useWatch({
    control: form.control,
    name: 'parentId',
  });
  
  const departmentName = useWatch({
    control: form.control,
    name: 'name',
  });

  const isAcademicAffairs = parentId === 'Academic Affairs';
  const isCustomName = departmentName === 'Custom Name';

  // When 'Custom Name' is selected, we want the validation to apply to the 'customName' field.
   const modifiedOnSubmit = (values: DepartmentFormData) => {
    if (values.name === 'Custom Name' && values.customName) {
      onSubmit({ ...values, name: values.customName });
    } else {
      onSubmit(values);
    }
  };

  useEffect(() => {
    if (!isAcademicAffairs) {
      form.setValue('name', '');
    }
  }, [isAcademicAffairs, form]);
  
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

            {isAcademicAffairs ? (
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Department Name</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a department section" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {academicAffairsDepartments.map(deptName => (
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
                        <Input placeholder="e.g., Senior Secondary Wing" {...field} />
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