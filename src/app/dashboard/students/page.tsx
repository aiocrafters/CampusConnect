
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldStudentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/school-admin/students');
  }, [router]);

  return null; 
}
