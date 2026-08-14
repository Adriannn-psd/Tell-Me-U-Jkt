"use client";

import Link from "next/link";

export interface Student {
  id: string;
  name: string;
  username: string;
  prodi: string;
  avatar: string;
  skills: string[];
  mutuals: number;
}

export default function StudentCard({ student }: { student: Student }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border-color)] rounded-2xl p-5 flex flex-col hover:border-[var(--color-text-3)] transition group cursor-pointer">
      
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-white text-xl font-bold border border-[var(--color-border-color)] shrink-0">
          {student.avatar}
        </div>
        <div>
          <Link href={`/profile/${student.username}`} className="text-white font-bold text-lg hover:underline decoration-[var(--color-brand-red)] underline-offset-4 line-clamp-1">
            {student.name}
          </Link>
          <p className="text-[var(--color-text-3)] text-xs font-medium mt-0.5">{student.prodi}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {student.skills.map(skill => (
          <span key={skill} className="bg-[var(--color-bg)] border border-[var(--color-border-color)] text-[var(--color-text-2)] text-[10px] font-bold px-2 py-1 rounded-md">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--color-border-color)]">
        <div className="flex items-center gap-2">
          {student.mutuals > 0 && (
            <span className="text-[10px] text-[var(--color-text-3)] font-semibold">{student.mutuals} Koneksi yang sama</span>
          )}
        </div>
        
        <Link href={`/profile/${student.username}`} className="bg-[var(--color-surface-2)] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#2a2a30] transition border border-[var(--color-border-color)]">
          Lihat Profil
        </Link>
      </div>
      
    </div>
  );
}
