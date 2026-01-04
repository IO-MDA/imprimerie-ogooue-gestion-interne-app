import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SousTachesManager({ tache, users, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [newSousTache, setNewSousTache] = useState({
    titre: '',
    assigne_a: '',
    statut: 'en_attente'
  });

  const handleAddSousTache = () => {
    if (!newSousTache.titre) {
      toast.error('Le titre est obligatoire');
      return;
    }

    const updatedSousTaches = [
      ...(tache.sous_taches || []),
      {
        id: Date.now().toString(),
        titre: newSousTache.titre,
        assigne_a: newSousTache.assigne_a,
        assigne_a_nom: users.find(u => u.email === newSousTache.assigne_a)?.full_name || newSousTache.assigne_a,
        statut: 'en_attente',
        created_date: new Date().toISOString()
      }
    ];

    onUpdate({ sous_taches: updatedSousTaches });
    setNewSousTache({ titre: '', assigne_a: '', statut: 'en_attente' });
    setShowForm(false);
    toast.success('Sous-tâche ajoutée');
  };

  const handleToggleSousTache = (sousTacheId) => {
    const updatedSousTaches = (tache.sous_taches || []).map(st =>
      st.id === sousTacheId
        ? { ...st, statut: st.statut === 'terminee' ? 'en_attente' : 'terminee' }
        : st
    );
    onUpdate({ sous_taches: updatedSousTaches });
  };

  const handleDeleteSousTache = (sousTacheId) => {
    const updatedSousTaches = (tache.sous_taches || []).filter(st => st.id !== sousTacheId);
    onUpdate({ sous_taches: updatedSousTaches });
    toast.success('Sous-tâche supprimée');
  };

  const sousTaches = tache.sous_taches || [];
  const completed = sousTaches.filter(st => st.statut === 'terminee').length;

  return (
    <Card className="border-0 bg-slate-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📋 Sous-tâches
            {sousTaches.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700">
                {completed}/{sousTaches.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <Card className="border-2 border-blue-200 bg-white">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Titre de la sous-tâche"
                value={newSousTache.titre}
                onChange={(e) => setNewSousTache({ ...newSousTache, titre: e.target.value })}
              />
              <Select
                value={newSousTache.assigne_a}
                onValueChange={(v) => setNewSousTache({ ...newSousTache, assigne_a: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assigner à (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.email}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleAddSousTache} className="flex-1 bg-emerald-600">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {sousTaches.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Aucune sous-tâche. Cliquez sur "Ajouter" pour décomposer cette tâche.
          </p>
        ) : (
          <div className="space-y-2">
            {sousTaches.map(st => (
              <div
                key={st.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => handleToggleSousTache(st.id)}
                  className="flex-shrink-0"
                >
                  {st.statut === 'terminee' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${st.statut === 'terminee' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {st.titre}
                  </p>
                  {st.assigne_a_nom && (
                    <p className="text-xs text-slate-500">
                      Assigné à {st.assigne_a_nom}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSousTache(st.id)}
                  className="text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}