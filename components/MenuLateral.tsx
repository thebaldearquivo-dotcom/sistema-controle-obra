"use client";

import Link from "next/link";
import { BookOpen, Building2, CalendarDays, ClipboardList, Home, Users } from "lucide-react";

const itens = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/obras", label: "Obras", icon: Building2 },
  { href: "/servicos", label: "Serviços", icon: ClipboardList },
  { href: "/diario", label: "Diário de Obra", icon: BookOpen },
  { href: "/cronograma", label: "Cronograma Físico", icon: CalendarDays },
  { href: "/equipe", label: "Equipe", icon: Users },
];

export function MenuLateral({ ativo }: { ativo?: string }) {
  return (
    <nav className="grid gap-1">
      {itens.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
            ativo === href ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Icon size={18} /> {label}
        </Link>
      ))}
    </nav>
  );
}

export default MenuLateral;
