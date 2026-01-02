import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import RoleProtection from '@/components/auth/RoleProtection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HardHat, Building2, UtensilsCrossed, Plus, TrendingUp, DollarSign, Calendar, Sparkles, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import TravauxForm from '@/components/travaux/TravauxForm.jsx';
import TravauxList from '@/components/travaux/TravauxList.jsx';
import TravauxBilan from '@/components/travaux/TravauxBilan.jsx';
import TravauxOptimisationIA from '@/components/travaux/TravauxOptimisationIA.jsx';

export default function Travaux() {
  const [travaux, setTravaux] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showOptimisation, setShowOptimisation] = useState(false);
  const [editingTravail, setEditingTravail] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [availableProjects, setAvailableProjects] = useState([]);
  const [activeView, setActiveView] = useState('liste');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [travauxData, userData] = await Promise.all([
        base44.entities.Travail.list('-date'),
        base44.auth.me()
      ]);
      setTravaux(travauxData);
      setUser(userData);
      
      // Extract unique projects
      const projects = [...new Set(travauxData.map(t => t.projet))].filter(Boolean);
      setAvailableProjects(projects);
      if (projects.length > 0 && !activeTab) {
        setActiveTab(projects[0]);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingTravail) {
        await base44.entities.Travail.update(editingTravail.id, data);
        toast.success('Travaux mis à jour');
      } else {
        await base44.entities.Travail.create(data);
        toast.success('Travaux enregistrés');
      }
      setShowForm(false);
      setEditingTravail(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleEdit = (travail) => {
    setEditingTravail(travail);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Supprimer ces travaux ?')) {
      await base44.entities.Travail.delete(id);
      toast.success('Travaux supprimés');
      loadData();
    }
  };

  const travauxFiltered = travaux.filter(t => t.projet === activeTab);
  
  const totalDepenses = travauxFiltered.reduce((sum, t) => sum + (t.montant || 0), 0);
  const totalPaye = travauxFiltered.reduce((sum, t) => sum + (t.montant_paye || 0), 0);
  const totalRestant = totalDepenses - totalPaye;
  const avancementMoyen = travauxFiltered.length > 0 
    ? travauxFiltered.reduce((sum, t) => sum + (t.avancement || 0), 0) / travauxFiltered.length 
    : 0;

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin', 'manager']} user={user}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-7 h-7 text-orange-600" />
            Travaux Groupe Ogooué
          </h1>
          <p className="text-slate-500">Suivi des travaux Papeterie & Restaurant</p>
        </div>
        <div className="flex items-center gap-2">
          {availableProjects.length > 0 && (
            <Button 
              onClick={() => setShowOptimisation(true)}
              variant="outline"
              className="border-violet-300 text-violet-600 hover:bg-violet-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Analyse IA
            </Button>
          )}
          {(isAdmin || isManager) && (
            <Button 
              onClick={() => { setEditingTravail(null); setShowForm(true); }}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter travaux
            </Button>
          )}
        </div>
      </div>

      {availableProjects.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <HardHat className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Aucun projet de travaux enregistré</p>
            {(isAdmin || isManager) && (
              <Button onClick={() => { setEditingTravail(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier projet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 flex-wrap">
          {availableProjects.map(projet => (
            <TabsTrigger key={projet} value={projet} className="flex items-center gap-2">
              <HardHat className="w-4 h-4" />
              {projet}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total dépenses</p>
                    <p className="text-xl font-bold text-slate-900">{totalDepenses.toLocaleString()} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total payé</p>
                    <p className="text-xl font-bold text-emerald-900">{totalPaye.toLocaleString()} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Reste à payer</p>
                    <p className="text-xl font-bold text-rose-900">{totalRestant.toLocaleString()} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avancement</p>
                    <p className="text-xl font-bold text-blue-900">{avancementMoyen.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Views */}
          <div className="flex items-center gap-2">
            <Button
              variant={activeView === 'liste' ? 'default' : 'outline'}
              onClick={() => setActiveView('liste')}
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Liste
            </Button>
            <Button
              variant={activeView === 'bilan' ? 'default' : 'outline'}
              onClick={() => setActiveView('bilan')}
              size="sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Bilan
            </Button>
          </div>

          {activeView === 'liste' && (
            <TravauxList 
              travaux={travauxFiltered}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={isAdmin || isManager}
            />
          )}

          {activeView === 'bilan' && (
            <TravauxBilan travaux={travauxFiltered} projet={activeTab} />
          )}
        </TabsContent>
      </Tabs>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTravail ? 'Modifier' : 'Ajouter'} des travaux
            </DialogTitle>
          </DialogHeader>
          <TravauxForm
            travail={editingTravail}
            defaultProjet={activeTab}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTravail(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Optimisation IA Dialog */}
      <Dialog open={showOptimisation} onOpenChange={setShowOptimisation}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Optimisation IA - {activeTab === 'papeterie' ? 'Papeterie' : 'Restaurant'} Ogooué</DialogTitle>
          </DialogHeader>
          <TravauxOptimisationIA travaux={travauxFiltered} projet={activeTab} />
        </DialogContent>
      </Dialog>
    </div>
    </RoleProtection>
  );
}