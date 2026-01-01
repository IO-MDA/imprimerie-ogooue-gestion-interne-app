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

  // Autoriser l'accès si le rôle de l'utilisateur est dans la liste des rôles autorisés
  // Supporter: 'admin', 'manager', 'user' (anciennement 'opérateur')
  const userRole = user.role === 'user' ? 'employe' : user.role;
  
  if (!allowedRoles.includes(userRole) && !allowedRoles.includes(user.role)) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-300 mx-auto mb-4" />
          <p className="text-slate-700 font-medium mb-2">Accès non autorisé</p>
          <p className="text-slate-500">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          <p className="text-xs text-slate-400 mt-4">
            Votre rôle: {user.role === 'admin' ? 'Administrateur' : user.role === 'manager' ? 'Manager' : 'Employé'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}