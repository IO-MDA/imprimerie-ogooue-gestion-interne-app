import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function TravauxBilan({ travaux, projet }) {
  const totalDepenses = travaux.reduce((sum, t) => sum + (t.montant || 0), 0);
  const totalPaye = travaux.reduce((sum, t) => sum + (t.montant_paye || 0), 0);
  const totalRestant = totalDepenses - totalPaye;

  const travauxParType = {};
  travaux.forEach(t => {
    if (!travauxParType[t.type_travail]) {
      travauxParType[t.type_travail] = { montant: 0, count: 0 };
    }
    travauxParType[t.type_travail].montant += t.montant;
    travauxParType[t.type_travail].count += 1;
  });

  const chartDataByType = Object.entries(travauxParType).map(([type, data]) => ({
    name: type,
    montant: data.montant,
    count: data.count
  }));

  const pieData = [
    { name: 'Payé', value: totalPaye, color: '#10b981' },
    { name: 'Reste', value: totalRestant, color: '#f43f5e' }
  ];

  const travauxEnCours = travaux.filter(t => t.avancement < 100).length;
  const travauxTermines = travaux.filter(t => t.avancement === 100).length;
  const avancementMoyen = travaux.length > 0 
    ? travaux.reduce((sum, t) => sum + (t.avancement || 0), 0) / travaux.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-orange-600">Budget total</p>
                <p className="text-lg font-bold text-orange-900">{totalDepenses.toLocaleString()} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600">Déjà payé</p>
                <p className="text-lg font-bold text-emerald-900">{totalPaye.toLocaleString()} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-rose-600">Reste à payer</p>
                <p className="text-lg font-bold text-rose-900">{totalRestant.toLocaleString()} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600">Progression</p>
                <p className="text-lg font-bold text-blue-900">{avancementMoyen.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Dépenses par type de travaux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="montant" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>État des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Nombre de travaux</span>
              <span className="font-semibold">{travaux.length}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Travaux en cours</span>
              <span className="font-semibold text-blue-600">{travauxEnCours}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-600">Travaux terminés</span>
              <span className="font-semibold text-emerald-600">{travauxTermines}</span>
            </div>
            <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-700 font-medium">Taux de paiement</span>
              <span className="font-bold text-blue-900">
                {totalDepenses > 0 ? ((totalPaye / totalDepenses) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}