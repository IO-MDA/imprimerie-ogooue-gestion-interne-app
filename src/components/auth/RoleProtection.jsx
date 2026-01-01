import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from 'lucide-react';

export default function RoleProtection({ children, allowedRoles, user }) {
  if (!user) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Vous devez être connecté pour accéder à cette page</p>
        </CardContent>
      </Card>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium mb-2">Accès non autorisé</p>
          <p className="text-slate-500">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <p className="text-xs text-slate-400 mt-4">Contactez un administrateur si vous pensez que c'est une erreur.</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}